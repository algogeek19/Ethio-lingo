import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ArrowRight, Lock, RefreshCw, Clock, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { useRole } from '../../context/RoleContext';
import { api } from '../../services/api';
import { useSiteContent } from '../../context/SiteContentContext';

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
  const { c } = useSiteContent();

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
      setLockError(c('exam.adminNotice'));
      setLoading(false);
      return;
    }

    if (isBalanceZero && !isFreeTrialMode) {
      setLockError(c('exam.zeroBalanceLock'));
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
        setLockError(err.message || c('exam.lockedNotice'));
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
          // The streak was already credited server-side by the exam grading
          // itself. Calling advanceStreak() here as well double-counted the day
          // whenever both paths ran.
          if (advanceStreak) advanceStreak({ silent: true });
        }
        setIsSubmitted(true);
        if (refreshWorkspaceProgress) refreshWorkspaceProgress();
      } else {
        setSubmitError(response?.message || c('exam.submitFailed'));
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      setSubmitError(err?.message || c('exam.submitError'));
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
              {authUser?.role === 'admin' ? 'Admin Access Notice' : c('exam.lockedBadge')}
            </span>
            <h2 className="font-cormorant text-3xl font-medium text-on-surface mt-2">
              {authUser?.role === 'admin'
                ? 'Admin Account Exemption'
                 : c('exam.lockedTitle')}
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
                <span>{c('exam.goToDashboard')}</span>
                <ArrowRight size={16} />
              </button>
            ) : isBalanceZero && !isFreeTrialMode ? (
              <button
                onClick={() => navigate('/wallet')}
                className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer hover:bg-primary-container"
              >
                <span>{c('exam.topUpVault')}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/workspaces')}
                  className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 btn-interactive focus-ring cursor-pointer hover:bg-primary-container"
                >
                  <span>{c('exam.openWorkspaces')}</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-surface-container text-on-surface font-semibold rounded-full text-xs uppercase tracking-wider border border-hairline transition-all focus-ring cursor-pointer hover:bg-surface-container-high"
                >
                  {c('exam.backToDashboard')}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = examQuestions[currentIdx] || {
    question: c('exam.sampleQuestion'),
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
              {c('exam.headerBadge')}
            </span>
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em]">
              {c('exam.headerMeta', { count: headerQuestionCount, pct: passPercent })}
            </span>
          </div>
          <h1 className="font-cormorant text-3xl text-on-surface font-medium leading-tight">
            {c('exam.headerTitle', { level: currentLevel })}
          </h1>
          <p className="font-mono text-[11px] text-on-surface-variant mt-1.5">
            {c('exam.headerSubtitle', { day: currentModuleDay, threshold: basePassThreshold, pct: passPercent })}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em]">{c('exam.penaltyLabel')}</span>
            <span className="font-cormorant text-2xl text-tertiary font-bold tabular-nums">
              -ETB {(scoreResult?.slashedPenalty || 25).toFixed(2)}
            </span>
          </div>
          <div className="h-12 w-px bg-hairline/60 hidden sm:block" />
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] text-text-muted uppercase tracking-[0.2em] flex items-center gap-1">
              <Clock size={11} className="text-warning-amber" />
              <span>{c('exam.timeRemaining')}</span>
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
              {c('exam.questionOf', { count: currentIdx + 1, total: examQuestions.length })}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              {currentQ.id != null && <span className="mr-3">ID: {currentQ.id}</span>}
              {c('exam.answeredOf', { count: Object.keys(selectedAnswers).length, total: examQuestions.length })}
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
              <span>{c('exam.selectAnswerWarning')}</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-hairline/60">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-5 py-2.5 border border-hairline/40 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed focus-ring cursor-pointer transition-colors"
            >
              {c('exam.previous')}
            </button>

            {submitError && (
              <div className="p-3 bg-destructive-red/10 border border-destructive-red/30 rounded-xl text-xs text-destructive-red font-mono flex items-center justify-between gap-3">
                <span>⚠️ {submitError}</span>
                <button type="button" onClick={() => setSubmitError(null)} className="text-xs underline hover:opacity-80 ml-2 shrink-0 cursor-pointer">
                  {c('exam.dismiss')}
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
                {c('exam.next')}
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
                {submitting ? c('exam.grading') : c('exam.submit')}
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
              {scoreResult.passed ? c('exam.passedBadge') : c('exam.failedBadge')}
            </span>
            <h2 className="font-cormorant text-3xl font-medium text-on-surface mt-2">
              {scoreResult.passed ? c('exam.passedTitle') : c('exam.failedTitle', { amount: scoreResult.slashedPenalty || 25 })}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {c('exam.scoreAchieved')} <strong className="font-mono text-lg text-on-surface tabular-nums">{scoreResult.correctCount} / {scoreResult.total}</strong> ({scoreResult.score}%)
            </p>
            <p className="text-xs font-mono text-on-surface-variant">
              {c('exam.thresholdLine')} <strong className="text-primary">{scoreResult.passThreshold} / {scoreResult.total}</strong>
              {scoreResult.adaptiveThresholdActive && (
                <span className="ml-1 text-warning-amber">{c('exam.adaptiveNote')}</span>
              )}
            </p>
          </div>

          {/* Current Streak Badge */}
          <div className="p-4 bg-surface-container-low border border-hairline/60 rounded-xl max-w-md mx-auto flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-on-surface-variant">{c('exam.streakLabel')}</span>
            <span className="px-3 py-1 bg-streak-orange text-white font-bold rounded-full tracking-wider whitespace-nowrap">
              🔥 {scoreResult.newStreak ?? streak?.count ?? 0} {c('exam.streakSuffix')}
            </span>
          </div>

          <div className="p-4 bg-surface-dark text-stone-300 rounded-xl max-w-md mx-auto text-xs space-y-2 font-mono border border-stone-800">
            {scoreResult.passed ? (
              <div className="text-success-green">
                {isFreeTrialMode ? (
                  currentModuleDay >= 7 ? (
                    <span>{c('exam.passTrialComplete', { level: authUser?.level || currentLevel })}</span>
                  ) : (
                    <span>✓ {c('exam.passTrialPartial', { day: currentModuleDay, nextDay: currentModuleDay + 1 })}</span>
                  )
                ) : currentModuleDay === 30 ? (
                  <span>✓ {c('exam.passLevelComplete', { level: currentLevel, nextLevel: nextLevel || 'Next Level' })}</span>
                ) : (
                  <span>✓ {c('exam.passSuccess', { day: currentModuleDay, nextDay: currentModuleDay + 1 })}</span>
                )}
              </div>
            ) : (
              <div className="text-destructive-red space-y-1">
                <p>⚠ {c('exam.failThreshold', { threshold: scoreResult.passThreshold || basePassThreshold })}</p>
                <p>{c('exam.failIncomplete')}</p>
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
                    {c('exam.mistakesReview')}
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
                        <span className="font-bold text-destructive-red block text-[10px] uppercase tracking-wider mb-0.5">{c('exam.yourAnswerLabel')}</span>
                        <span className="text-destructive-red">{m.yourAnswer || '(Not answered)'}</span>
                      </div>
                      <div className="p-2.5 bg-success-green/10 border border-success-green/25 rounded-lg font-mono">
                        <span className="font-bold text-success-green block text-[10px] uppercase tracking-wider mb-0.5">{c('exam.correctAnswerLabel')}</span>
                        <span className="text-success-green">{m.correctAnswer}</span>
                      </div>
                    </div>
                    {m.explanation && (
                      <div className="pt-1">
                        <span className="font-bold text-primary block text-[10px] uppercase tracking-wider">{c('exam.explanationLabel')}</span>
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
                currentModuleDay >= 7 ? (
                  <button
                    onClick={() => navigate('/wallet')}
                    className="px-6 py-3 bg-primary text-on-primary font-bold rounded-full text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer hover:bg-primary-container"
                  >
                    <span>{c('exam.trialDepositButton', { level: authUser?.level || currentLevel })}</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="px-5 py-3 bg-success-green/10 border border-success-green/30 text-success-green font-mono text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs">
                    <Lock size={15} />
                    <span>{c('exam.unlockNextDay', { nextDay: currentModuleDay + 1 })}</span>
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
                  <span>{c('exam.advanceLevel', { nextLevel: nextLevel || 'Next Level' })}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="px-5 py-3 bg-success-green/10 border border-success-green/30 text-success-green font-mono text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs">
                  <Lock size={15} />
                  <span>{c('exam.unlockNextDay', { nextDay: currentModuleDay + 1 })}</span>
                </div>
              )
            ) : (
              <button
                onClick={handleRetakeExam}
                className="px-6 py-3 bg-destructive-red text-on-primary font-extrabold rounded-full text-xs uppercase tracking-wider hover:bg-destructive-red/80 flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>{c('exam.retake')} (-{scoreResult.slashedPenalty || 25} ETB)</span>
              </button>
            )}

            <button
              onClick={() => navigate('/exam/review')}
              className="px-6 py-3 bg-surface-container border border-hairline text-on-surface font-semibold rounded-full text-xs hover:bg-surface-container-high flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <BookOpen size={14} />
              <span>{c('exam.reviewResults')}</span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-full text-xs uppercase tracking-wider hover:bg-primary-container flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <span>{c('exam.returnDashboard')}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DailyExamRunner;