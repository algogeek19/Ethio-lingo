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
  const passPercent = Math.round((basePassThreshold / 20) * 100);

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
        <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-8 space-y-6 shadow-sm animate-skeleton">
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
          className="bg-surface-container-lowest border border-warning-amber/30 rounded-2xl p-8 text-center space-y-6 shadow-sm"
        >
          <div className="w-16 h-16 bg-warning-amber/15 text-warning-amber rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Lock size={28} />
          </div>
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-warning-amber/15 text-warning-amber font-mono text-[9px] font-bold rounded-full uppercase tracking-[0.2em]">
              {authUser?.role === 'admin' ? 'Admin Access Notice' : 'Daily Exam Locked'}
            </span>
            <h2 className="font-cormorant text-3xl font-medium text-on-surface mt-2">
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
                className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer hover:bg-primary-container"
              >
                <span>Go to Admin Dashboard</span>
                <ArrowRight size={16} />
              </button>
            ) : isBalanceZero && !isFreeTrialMode ? (
              <button
                onClick={() => navigate('/wallet')}
                className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer hover:bg-primary-container"
              >
                <span>Top Up Escrow Stake in Vault</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/workspaces')}
                  className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer hover:bg-primary-container"
                >
                  <span>Open Learning Workspaces</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-surface-container text-on-surface font-semibold rounded-full text-xs uppercase tracking-wider border border-hairline transition-all focus-ring cursor-pointer hover:bg-surface-container-high"
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

  const headerQuestionCount = examQuestions.length || scoreResult?.total || 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-4xl mx-auto py-8 px-4 space-y-6 transition-colors duration-250"
    >
      {/* Header Bar */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-[9px] bg-tertiary-fixed-dim/30 text-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-[0.2em]">
              Escrow at Stake
            </span>
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em]">
              · {headerQuestionCount} Questions · {passPercent}% Pass Required
            </span>
          </div>
          <h1 className="font-cormorant text-3xl text-on-surface font-medium leading-tight">
            Daily Diagnostic Exam ({currentLevel})
          </h1>
          <p className="font-mono text-[11px] text-on-surface-variant mt-1.5">
            Module Day {currentModuleDay} — threshold {basePassThreshold}/20 ({passPercent}%) — drops to 10/20 (50%) after 3 attempts
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em]">Penalty for Failure</span>
            <span className="font-cormorant text-2xl text-tertiary font-bold tabular-nums">
              -ETB {(scoreResult?.slashedPenalty || 25).toFixed(2)}
            </span>
          </div>
          <div className="h-12 w-px bg-hairline/60 hidden sm:block" />
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] flex items-center gap-1">
              <Clock size={11} className="text-warning-amber" />
              <span>Time Remaining</span>
            </span>
            <span className="font-mono text-2xl font-bold text-warning-amber tabular-nums leading-tight">
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Exam Quiz Area */}
      {!isSubmitted ? (
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-hairline/60 shadow-sm max-w-4xl mx-auto w-full">
          {/* Question Meta Row */}
          <div className="flex items-center justify-between pb-4 border-b border-hairline/60">
            <span className="font-mono text-[11px] text-primary font-bold tracking-widest uppercase">
              Question {currentIdx + 1} of {examQuestions.length}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              {currentQ.id != null && <span className="mr-3">ID: {currentQ.id}</span>}
              Answered: <strong className="text-on-surface">{Object.keys(selectedAnswers).length}</strong> / {examQuestions.length}
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
              <h3 className="font-cormorant text-2xl text-on-surface leading-snug font-medium">
                {currentQ.question}
              </h3>

              {/* Options Grid with High Contrast Selected State */}
              <div className="flex flex-col gap-3 pt-2">
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentIdx] === oIdx;
                  return (
                    <motion.button
                      key={oIdx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectOption(currentIdx, oIdx)}
                      className={`w-full text-left p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high cursor-pointer border transition-all flex items-center justify-between gap-4 focus-ring ${
                        isSelected
                          ? 'border-primary ring-1 ring-primary/40'
                          : 'border-hairline/40'
                      }`}
                    >
                      <span className={`text-xs sm:text-sm ${isSelected ? 'font-medium text-on-surface' : 'text-on-surface'}`}>
                        {opt}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-xs shrink-0 ${
                          isSelected ? 'border-primary text-primary font-bold' : 'border-hairline text-text-muted'
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
            <div className="p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-xl text-xs text-warning-amber font-mono text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning-amber animate-ping" />
              <span>Please select an answer option above to proceed to the next question.</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-hairline/60">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-5 py-2.5 border border-hairline/40 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed focus-ring cursor-pointer transition-colors"
            >
              &larr; Previous
            </button>

            {submitError && (
              <div className="p-3 bg-destructive-red/10 border border-destructive-red/30 rounded-xl text-xs text-destructive-red font-mono flex items-center justify-between gap-3">
                <span>⚠️ {submitError}</span>
                <button type="button" onClick={() => setSubmitError(null)} className="text-xs underline hover:opacity-80 ml-2 shrink-0 cursor-pointer">
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
                className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm transition-all focus-ring ${
                  selectedAnswers[currentIdx] !== undefined
                    ? 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer btn-interactive'
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
                className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm transition-all focus-ring flex items-center gap-2 ${
                  selectedAnswers[currentIdx] !== undefined && !submitting
                    ? 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer btn-interactive'
                    : 'bg-surface-card text-text-muted cursor-not-allowed opacity-60'
                }`}
              >
                {submitting && <RefreshCw size={14} className="animate-spin" />}
                {submitting ? 'Grading Assessment...' : 'Submit & Seal Exam'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Modal / Panel */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm max-w-4xl mx-auto w-full"
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner border ${
              scoreResult.passed
                ? 'bg-success-green/15 text-success-green border-success-green/30'
                : 'bg-destructive-red/15 text-destructive-red border-destructive-red/30'
            }`}
          >
            {scoreResult.passed ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
          </div>

          <div className="space-y-2">
            <span className={`inline-block px-3 py-1 font-mono text-[9px] font-bold rounded-full uppercase tracking-[0.2em] ${
              scoreResult.passed
                ? 'bg-success-green/15 text-success-green'
                : 'bg-destructive-red/15 text-destructive-red'
            }`}>
              {scoreResult.passed ? 'Exam Closed & Record Locked' : 'Assessment Result'}
            </span>
            <h2 className="font-cormorant text-3xl font-medium text-on-surface mt-2">
              {scoreResult.passed ? 'Daily Exam Passed!' : `Exam Failed — ETB ${scoreResult.slashedPenalty || 25} Penalty Slashed`}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Score achieved: <strong className="font-mono text-lg text-on-surface tabular-nums">{scoreResult.correctCount} / {scoreResult.total}</strong> ({scoreResult.score}%)
            </p>
            <p className="text-xs font-mono text-on-surface-variant">
              Passing threshold: <strong className="text-primary">{scoreResult.passThreshold} / {scoreResult.total}</strong>
              {scoreResult.adaptiveThresholdActive && (
                <span className="ml-1 text-warning-amber">(adaptive bar active after 3 attempts)</span>
              )}
            </p>
          </div>

          {/* Current Streak Badge */}
          <div className="p-4 bg-surface-container-low border border-hairline/60 rounded-xl max-w-md mx-auto flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-on-surface-variant">Current Learner Streak:</span>
            <span className="px-3 py-1 bg-streak-orange text-white font-bold rounded-full tracking-wider whitespace-nowrap">
              🔥 {scoreResult.newStreak ?? streak?.count ?? 0} Day Streak
            </span>
          </div>

          <div className="p-4 bg-surface-dark text-stone-300 rounded-xl max-w-md mx-auto text-xs space-y-2 font-mono border border-stone-800">
            {scoreResult.passed ? (
              <div className="text-success-green">
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
              <div className="text-destructive-red space-y-1">
                <p>⚠ Score below passing threshold ({scoreResult.passThreshold || basePassThreshold}/20 required).</p>
                <p>Task 4 remains INCOMPLETE and retake is required. {!isFreeTrialMode && `ETB ${scoreResult.slashedPenalty || 25} penalty deducted from escrow stake.`}</p>
              </div>
            )}
          </div>

          {/* Mistakes Review with Explanations */}
          {scoreResult.mistakes && scoreResult.mistakes.length > 0 && (
            <div className="p-4 sm:p-6 bg-surface-container-low border border-hairline/60 rounded-2xl space-y-4 text-left shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 bg-destructive-red/15 text-destructive-red font-mono text-[9px] font-bold rounded-full uppercase tracking-wider">
                    Mistakes Review
                  </span>
                  <h3 className="font-cormorant text-xl font-medium text-on-surface">
                    Review your incorrect answers
                  </h3>
                </div>
                <span className="text-xs font-mono text-on-surface-variant">
                  {scoreResult.mistakes.length} question{scoreResult.mistakes.length !== 1 ? 's' : ''} to review
                </span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {scoreResult.mistakes.map((m, idx) => (
                  <div key={m.questionId || idx} className="p-4 bg-surface-container-lowest border border-hairline/60 rounded-xl space-y-2">
                    <div className="text-xs font-mono font-semibold text-destructive-red tracking-wider uppercase">
                      Question {idx + 1} — Incorrect
                    </div>
                    <p className="text-sm font-medium text-on-surface">{m.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-destructive-red/10 border border-destructive-red/25 rounded-lg font-mono">
                        <span className="font-bold text-destructive-red block text-[10px] uppercase tracking-wider mb-0.5">Your answer</span>
                        <span className="text-destructive-red">{m.yourAnswer || '(Not answered)'}</span>
                      </div>
                      <div className="p-2.5 bg-success-green/10 border border-success-green/25 rounded-lg font-mono">
                        <span className="font-bold text-success-green block text-[10px] uppercase tracking-wider mb-0.5">Correct answer</span>
                        <span className="text-success-green">{m.correctAnswer}</span>
                      </div>
                    </div>
                    {m.explanation && (
                      <div className="pt-1">
                        <span className="font-bold text-primary block text-[10px] uppercase tracking-wider">Explanation</span>
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
                    className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer hover:bg-primary-container"
                  >
                    <span>Deposit ETB 1,000 to Start Day 1 of {authUser?.level || 'Beginner I'}</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="px-5 py-3 bg-success-green/10 border border-success-green/30 text-success-green font-mono text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs">
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
                  className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer hover:bg-primary-container"
                >
                  <span>Advance to {nextLevel || 'Next Level'} (Day 1)</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="px-5 py-3 bg-success-green/10 border border-success-green/30 text-success-green font-mono text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs">
                  <Lock size={15} />
                  <span>Day {currentModuleDay + 1} Unlocks at Midnight</span>
                </div>
              )
            ) : (
              <button
                onClick={handleRetakeExam}
                className="px-6 py-3 bg-destructive-red text-on-primary font-extrabold rounded-full text-xs uppercase tracking-wider hover:bg-destructive-red/80 flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Retake Exam Required (-{scoreResult.slashedPenalty || 25} ETB Penalty)</span>
              </button>
            )}

            <button
              onClick={() => navigate('/exam/review')}
              className="px-6 py-3 bg-surface-container border border-hairline text-on-surface font-semibold rounded-full text-xs hover:bg-surface-container-high flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <BookOpen size={14} />
              <span>Review Exam Results</span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider hover:bg-primary-container flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
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