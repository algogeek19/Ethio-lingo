import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ArrowRight, Lock, RefreshCw, Clock, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { useRole } from '../../context/RoleContext';
import { api } from '../../services/api';

const DailyExamRunner = () => {
  const navigate = useNavigate();
  const { authUser } = useRole();
  const {
    currentModuleDay,
    currentLevel,
    isFreeTrialMode,
    isBalanceZero,
    advanceStreak,
    advanceToNextDay,
    advanceToNextLevel,
    streak,
    refreshWorkspaceProgress,
  } = useStaking();

  const currentIdxLevel = CURRICULUM_LEVELS.indexOf(currentLevel || 'Beginner I');
  const nextLevel = (currentIdxLevel !== -1 && currentIdxLevel < CURRICULUM_LEVELS.length - 1)
    ? CURRICULUM_LEVELS[currentIdxLevel + 1]
    : null;

  // Level-based passing criteria: Beginner 15/20 (75%), Intermediate & Advanced 13/20 (65%), adaptive drops to 10
  const getBasePassThreshold = (level) => {
    if (level === 'Beginner I' || level === 'Beginner II') return 15;
    return 13;
  };
  const basePassThreshold = getBasePassThreshold(currentLevel || 'Beginner I');

  const [examQuestions, setExamQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lockError, setLockError] = useState(null);
  const [examAlreadyPassed, setExamAlreadyPassed] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timerSeconds, setTimerSeconds] = useState(20 * 60); // 20-minute timer
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch questions and check if daily exam was already passed in DB
  useEffect(() => {
    if (authUser?.role === 'admin') {
      setLockError('Admin accounts do not take daily diagnostic exams or maintain escrow stakes.');
      setLoading(false);
      return;
    }

    if (isBalanceZero && !isFreeTrialMode) {
      setLockError('Your daily exam is locked because your active escrow stake balance is 0 ETB. Submit a deposit to reactivate exams.');
      setLoading(false);
      return;
    }

    const fetchQuestionsAndStatus = async () => {
      setLoading(true);
      setLockError(null);
      const activeLevel = isFreeTrialMode ? 'Free Trial' : currentLevel;
      try {
        // Check DB progress via getDailyWorkspace
        const workspaceRes = await api.getDailyWorkspace(activeLevel, currentModuleDay).catch(() => null);
        if (workspaceRes && workspaceRes.success && workspaceRes.data && workspaceRes.data.progress) {
          const prog = workspaceRes.data.progress;
          if (prog.examCompleted && prog.examPassed) {
            setExamAlreadyPassed(true);
            setScoreResult({
              score: Math.round(((prog.examScore || 15) / 20) * 100),
              correctCount: prog.examScore || 15,
              total: 20,
              passed: true,
              newStreak: streak?.count || 0,
            });
            setIsSubmitted(true);
            setLoading(false);
            return;
          }
        }

        const response = await api.getDailyExamQuestions(activeLevel, currentModuleDay);
        if (response.success && response.data) {
          setExamQuestions(response.data);
        }
      } catch (err) {
        setLockError(err.message || 'Daily exam is locked. Please complete your daily workspace tasks first.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsAndStatus();
  }, [currentLevel, currentModuleDay, authUser?.role, isFreeTrialMode]);

  // Countdown timer effect
  useEffect(() => {
    if (isSubmitted || timerSeconds <= 0 || loading || lockError) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, timerSeconds, loading, lockError]);

  const handleSelectOption = (qIdx, optionIdx) => {
    if (isSubmitted || submitting || timerSeconds <= 0) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optionIdx }));
  };

  const handleFinishExam = async (isTimeout = false) => {
    if (submitting || isSubmitted) return;
    setSubmitting(true);
    setSubmitError(null);

    const answersArray = examQuestions.map((q, idx) => ({
      questionId: q.id,
      selectedOption: selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1,
    }));

    try {
      const activeLevel = isFreeTrialMode ? 'Free Trial' : currentLevel;
      const response = await api.submitExam(activeLevel, currentModuleDay, answersArray);
      if (response && response.success && response.data) {
        const res = response.data;
        setScoreResult({
          score: Math.round(res.percentage),
          correctCount: res.score,
          total: res.totalQuestions || 20,
          passed: res.passed,
          passThreshold: res.passThreshold ?? basePassThreshold,
          adaptiveThresholdActive: res.adaptiveThresholdActive || false,
          attemptsTaken: res.attemptsTaken || 1,
          newStreak: res.newStreak || (streak?.count || 0) + (res.passed ? 1 : 0),
          slashedPenalty: res.slashedPenalty || 0,
          mistakes: Array.isArray(res.mistakes) ? res.mistakes : [],
          timedOut: isTimeout || timerSeconds <= 0,
        });

        if (res.passed) {
          confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
          setExamAlreadyPassed(true);
        }
        setIsSubmitted(true);
        if (refreshWorkspaceProgress) refreshWorkspaceProgress();
      } else {
        setSubmitError(response?.message || 'Failed to submit exam. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      setSubmitError(err?.message || 'An error occurred while submitting your exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timerSeconds === 0 && !isSubmitted && !submitting && !loading && !lockError && examQuestions.length > 0) {
      handleFinishExam(true);
    }
  }, [timerSeconds, isSubmitted, submitting, loading, lockError, examQuestions.length]);

  const handleRetakeExam = () => {
    if (examAlreadyPassed) return;
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setTimerSeconds(20 * 60);
    setScoreResult(null);
  };

  const handleProceedNextDay = () => {
    advanceToNextDay();
    navigate('/workspaces');
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 space-y-6">
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-8 space-y-6 shadow-sm animate-skeleton">
          <div className="h-6 bg-surface-card rounded-md w-1/3" />
          <div className="h-10 bg-surface-card rounded-md w-3/4" />
          <div className="space-y-3 pt-4">
            <div className="h-12 bg-surface-card rounded-xl w-full" />
            <div className="h-12 bg-surface-card rounded-xl w-full" />
            <div className="h-12 bg-surface-card rounded-xl w-full" />
            <div className="h-12 bg-surface-card rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (lockError) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-surface-lowest border-2 border-amber-500/40 rounded-2xl p-8 text-center space-y-6 shadow-md"
        >
          <div className="w-16 h-16 bg-amber-500/20 text-amber-600 dark:text-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-900 dark:text-amber-200 font-mono text-xs font-bold rounded-lg uppercase tracking-wider">
              {authUser?.role === 'admin' ? 'Admin Access Notice' : 'Daily Exam Locked'}
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-on-surface mt-2">
              {authUser?.role === 'admin'
                ? 'Admin Account Exemption'
                : 'Complete 3 Workspace Tasks First'}
            </h2>
            <p className="text-xs font-mono text-on-surface-variant max-w-lg mx-auto leading-relaxed pt-1">
              {lockError}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {authUser?.role === 'admin' ? (
              <button
                onClick={() => navigate('/admin')}
                className="px-6 py-3 bg-surface-dark text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer"
              >
                <span>Go to Admin Dashboard</span>
                <ArrowRight size={16} />
              </button>
            ) : isBalanceZero && !isFreeTrialMode ? (
              <button
                onClick={() => navigate('/wallet')}
                className="px-6 py-3 bg-primary-coral hover:bg-primary-hover text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer"
              >
                <span>Top Up Escrow Stake in Vault →</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/workspaces')}
                  className="px-6 py-3 bg-primary-coral hover:bg-primary-hover text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer"
                >
                  <span>Open Learning Workspaces</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-surface-card hover:bg-surface-high text-on-surface font-semibold rounded-xl text-xs transition-all focus-ring cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = examQuestions[currentIdx] || {
    question: 'Sample Question',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    answerIndex: 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-4xl mx-auto py-8 px-4 space-y-6 transition-colors duration-250"
    >
      {/* Header Bar */}
      <div className="bg-surface-dark text-white rounded-2xl p-6 shadow-xl border border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-warning-amber uppercase tracking-wider font-bold block">
            20 Questions • {currentLevel} Module Day {currentModuleDay}
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white mt-1">
            Daily Diagnostic Exam ({currentLevel})
          </h1>
          <p className="text-xs text-stone-400 font-mono mt-0.5">
            Passing threshold: {basePassThreshold} / 20 correct answers ({basePassThreshold === 15 ? '75%' : '65%'}) — drops to 10/20 (50%) after 3 attempts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-stone-900 border border-stone-700 rounded-xl text-center shadow-inner">
            <span className="text-[10px] text-stone-400 font-mono block uppercase font-bold flex items-center gap-1">
              <Clock size={12} className="text-warning-amber" />
              <span>TIME REMAINING</span>
            </span>
            <span className="font-mono text-xl font-bold text-warning-amber">
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Exam Quiz Area */}
      {!isSubmitted ? (
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          {/* Question Counter & Progress */}
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant border-b border-hairline pb-4">
            <span className="font-bold text-primary-coral">
              QUESTION {currentIdx + 1} OF {examQuestions.length}
            </span>
            <span>
              Answered: <strong>{Object.keys(selectedAnswers).length}</strong> / {examQuestions.length}
            </span>
          </div>

          {/* Question Text with Animated Transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <h3 className="font-serif font-bold text-xl sm:text-2xl text-on-surface leading-relaxed">
                {currentQ.question}
              </h3>

              {/* Options Grid with High Contrast Selected State */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentIdx] === oIdx;
                  return (
                    <motion.button
                      key={oIdx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectOption(currentIdx, oIdx)}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center justify-between focus-ring cursor-pointer ${
                        isSelected
                          ? 'bg-primary-coral text-white border-primary-coral shadow-md font-semibold ring-2 ring-primary-coral/40'
                          : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary-coral'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-medium">{opt}</span>
                      <span
                        className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-xs ${
                          isSelected ? 'border-warning-amber text-warning-amber font-bold bg-black/25' : 'border-hairline text-text-muted'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Selection Required Warning Banner */}
          {selectedAnswers[currentIdx] === undefined && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 font-mono text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Please select an answer option above to proceed to the next question.</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-hairline">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 border border-hairline rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-card disabled:opacity-40 disabled:cursor-not-allowed focus-ring cursor-pointer"
            >
              &larr; Previous Question
            </button>

            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-mono flex items-center justify-between">
                <span>⚠️ {submitError}</span>
                <button type="button" onClick={() => setSubmitError(null)} className="text-xs underline hover:opacity-80 ml-2">
                  Dismiss
                </button>
              </div>
            )}

            {currentIdx < examQuestions.length - 1 ? (
              <button
                onClick={() => {
                  if (selectedAnswers[currentIdx] !== undefined) {
                    setCurrentIdx((prev) => Math.min(examQuestions.length - 1, prev + 1));
                  }
                }}
                disabled={selectedAnswers[currentIdx] === undefined}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all focus-ring ${
                  selectedAnswers[currentIdx] !== undefined
                    ? 'bg-primary-coral hover:bg-primary-hover text-white cursor-pointer btn-interactive'
                    : 'bg-surface-card text-text-muted cursor-not-allowed opacity-60'
                }`}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => {
                  if (selectedAnswers[currentIdx] !== undefined && !submitting) {
                    handleFinishExam();
                  }
                }}
                disabled={selectedAnswers[currentIdx] === undefined || submitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all focus-ring flex items-center gap-2 ${
                  selectedAnswers[currentIdx] !== undefined && !submitting
                    ? 'bg-success-green hover:bg-green-600 text-white cursor-pointer btn-interactive'
                    : 'bg-surface-card text-text-muted cursor-not-allowed opacity-60'
                }`}
              >
                {submitting && <RefreshCw size={14} className="animate-spin" />}
                {submitting ? 'Grading Assessment...' : 'Submit Exam & Grade Assessment'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Modal / Panel */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-8 text-center space-y-6 shadow-xl"
        >
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${
              scoreResult.passed
                ? 'bg-green-500/20 text-success-green'
                : 'bg-red-500/20 text-destructive-red'
            }`}
          >
            {scoreResult.passed ? <ShieldCheck size={44} /> : <ShieldAlert size={44} />}
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-surface-dark text-warning-amber font-mono text-xs font-bold rounded-lg uppercase tracking-wider">
              {scoreResult.passed ? 'Exam Closed & Record Locked' : 'Assessment Result'}
            </span>
            <h2 className="font-serif font-bold text-3xl text-on-surface mt-2">
              {scoreResult.passed ? 'Daily Exam Passed!' : `Exam Failed — ETB ${scoreResult.slashedPenalty || 25} Penalty Slashed`}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Score achieved: <strong className="font-mono text-lg text-on-surface">{scoreResult.correctCount} / {scoreResult.total}</strong> ({scoreResult.score}%)
            </p>
            <p className="text-xs font-mono text-on-surface-variant">
              Passing threshold: <strong className="text-primary-coral">{scoreResult.passThreshold} / {scoreResult.total}</strong>
              {scoreResult.adaptiveThresholdActive && (
                <span className="ml-1 text-warning-amber">(adaptive bar active after 3 attempts)</span>
              )}
            </p>
          </div>

          {/* Current Streak Badge */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-md mx-auto flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-amber-900 dark:text-amber-200">Current Learner Streak:</span>
            <span className="px-3 py-1 bg-streak-orange text-white font-bold rounded-lg">
              🔥 {scoreResult.newStreak ?? streak?.count ?? 0} Day Streak
            </span>
          </div>

          <div className="p-4 bg-surface-dark text-white rounded-xl max-w-md mx-auto text-xs space-y-2 font-mono">
            {scoreResult.passed ? (
              <div className="text-green-400">
                {isFreeTrialMode ? (
                  currentModuleDay >= 3 ? (
                    <span>🎉 Congratulations! You have completed your 3-Day Free Trial! Deposit 1,000 ETB to unlock Day 1 of {authUser?.level || 'Beginner I'} on the Staked Escrow Tier.</span>
                  ) : (
                    <span>✓ Free Trial Day {currentModuleDay} of 3 Passed! Day {currentModuleDay + 1} of 3 unlocks.</span>
                  )
                ) : currentModuleDay === 30 ? (
                  <span>✓ Level {currentLevel} Mastered (30/30 Days Complete)! {nextLevel ? `Advance to Day 1 of ${nextLevel} to continue your journey.` : 'All 6 curriculum levels completed!'}</span>
                ) : (
                  <span>✓ Passing criteria met (&ge; {scoreResult.passThreshold || basePassThreshold}/20). Module Day {currentModuleDay} complete! Streak updated and exam is officially closed for this module. Day {currentModuleDay + 1} unlocks at midnight.</span>
                )}
              </div>
            ) : (
              <div className="text-red-400 space-y-1">
                <p>⚠ Score below passing threshold ({scoreResult.passThreshold || basePassThreshold}/20 required).</p>
                <p>Task 4 remains INCOMPLETE and retake is required. {!isFreeTrialMode && `ETB ${scoreResult.slashedPenalty || 25} penalty deducted from escrow stake.`}</p>
              </div>
            )}
          </div>

          {/* Mistakes Review with Explanations */}
          {scoreResult.mistakes && scoreResult.mistakes.length > 0 && (
            <div className="p-4 sm:p-6 bg-surface-lowest border border-hairline rounded-2xl space-y-4 text-left shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <span className="px-2.5 py-0.5 bg-destructive-red/15 text-destructive-red font-mono text-[10px] font-bold rounded uppercase">
                    Mistakes Review
                  </span>
                  <h3 className="font-serif font-bold text-lg text-on-surface">
                    Review your incorrect answers
                  </h3>
                </div>
                <span className="text-xs font-mono text-on-surface-variant">
                  {scoreResult.mistakes.length} question{scoreResult.mistakes.length !== 1 ? 's' : ''} to review
                </span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {scoreResult.mistakes.map((m, idx) => (
                  <div key={m.questionId || idx} className="p-4 bg-surface-card/60 border border-hairline rounded-xl space-y-2">
                    <div className="text-xs font-mono font-semibold text-destructive-red">
                      QUESTION {idx + 1} — INCORRECT
                    </div>
                    <p className="text-sm font-medium text-on-surface">{m.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg font-mono">
                        <span className="font-bold text-red-400 block text-[10px] uppercase tracking-wider mb-0.5">Your answer</span>
                        <span className="text-red-300">{m.yourAnswer || '(Not answered)'}</span>
                      </div>
                      <div className="p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg font-mono">
                        <span className="font-bold text-green-400 block text-[10px] uppercase tracking-wider mb-0.5">Correct answer</span>
                        <span className="text-green-300">{m.correctAnswer}</span>
                      </div>
                    </div>
                    {m.explanation && (
                      <div className="pt-1">
                        <span className="font-bold text-primary-coral block text-[10px] uppercase tracking-wider">Explanation</span>
                        <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">{m.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {scoreResult.passed ? (
              isFreeTrialMode ? (
                currentModuleDay >= 3 ? (
                  <button
                    onClick={() => navigate('/wallet')}
                    className="px-6 py-3 bg-primary-coral hover:bg-primary-hover text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md focus-ring btn-interactive cursor-pointer"
                  >
                    <span>Deposit ETB 1,000 to Start Day 1 of {authUser?.level || 'Beginner I'}</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="px-5 py-3 bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
                    <Lock size={15} />
                    <span>Free Trial Day {currentModuleDay + 1} Unlocks at Midnight</span>
                  </div>
                )
              ) : currentModuleDay === 30 ? (
                <button
                  onClick={() => {
                    advanceToNextLevel();
                    navigate('/workspaces');
                  }}
                  className="px-6 py-3 bg-[#8f482f] hover:bg-[#a9583e] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md focus-ring btn-interactive cursor-pointer"
                >
                  <span>Advance to {nextLevel || 'Next Level'} (Day 1)</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="px-5 py-3 bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs">
                  <Lock size={15} />
                  <span>Day {currentModuleDay + 1} Unlocks at Midnight</span>
                </div>
              )
            ) : (
              <button
                onClick={handleRetakeExam}
                className="px-6 py-3 bg-destructive-red text-white font-extrabold rounded-xl text-xs hover:bg-red-700 flex items-center gap-2 shadow-md focus-ring btn-interactive cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Retake Exam Required (-{scoreResult.slashedPenalty || 25} ETB Penalty)</span>
              </button>
            )}

            <button
              onClick={() => navigate('/exam/review')}
              className="px-6 py-3 bg-surface-card border border-hairline text-on-surface font-semibold rounded-xl text-xs hover:border-primary-coral hover:text-primary-coral flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <BookOpen size={14} />
              <span>Review Exam Results</span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-primary-coral text-white font-semibold rounded-xl text-xs hover:bg-primary-hover flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <span>Return to Dashboard</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DailyExamRunner;
