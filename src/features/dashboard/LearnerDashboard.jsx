import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flame,
  ShieldAlert,
  ArrowUpRight,
  Wallet,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Lock,
  MessageSquare,
} from "lucide-react";
import { useStaking } from "../../context/StakingContext";
import { formatETB } from "../../utils/formatters";
import { api } from "../../services/api";
import { useSiteContent } from "../../context/SiteContentContext";
import CountdownWidget from "../../components/common/CountdownWidget";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    wallet,
    streak,
    currentModuleDay,
    currentLevel,
    dailyTasks,
    isBalanceZero,
    isFreeTrialMode,
    freeTrialDaysLeft,
    advanceToNextDay,
  } = useStaking();
  const { c } = useSiteContent();

  const safeDailyTasks = dailyTasks || { lesson: false, video: false, exam: false };
  const safeWallet = wallet || { stakedAmount: 0, yieldBalance: 0, totalPenalties: 0, totalPlatformFees: 0 };
  const safeUser = user || { name: '', level: 'Beginner I' };
  const safeStreak = streak || { count: 0 };
  const safeLevel = currentLevel || safeUser.level || 'Beginner I';

  const completedTasksCount = [
    safeDailyTasks.lesson,
    safeDailyTasks.video,
    safeDailyTasks.exam,
  ].filter(Boolean).length;

  const progressPercent = (completedTasksCount / 3) * 100;

  const handleStartNextDay = () => {
    advanceToNextDay();
    navigate('/workspaces');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-6 lg:px-12 py-10 space-y-10 transition-colors duration-250"
    >
      {/* Insufficient / Zero Balance Alert Banner */}
      {isBalanceZero && !isFreeTrialMode && (
        <motion.div
          variants={itemVariants}
          className="p-5 bg-surface-container-lowest border border-warning-amber/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-warning-amber/15 flex items-center justify-center text-warning-amber shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-cormorant font-medium text-lg text-warning-amber">
                {c('dashboard.pausedBadge')}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 font-light">
                {c('dashboard.pausedBody')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>{c('dashboard.submitDeposit')}</span>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Free Trial Banner */}
      {isFreeTrialMode && (
        <motion.div
          variants={itemVariants}
          className="p-4 bg-surface-container-lowest border border-hairline/60 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 ${
              freeTrialDaysLeft === 0 ? 'bg-warning-amber text-black' : 'bg-primary/10 text-primary'
            }`}>
              <Sparkles size={12} />
              <span>{freeTrialDaysLeft === 0 ? c('dashboard.trialCompleteBadge') : c('dashboard.trialActiveBadge')}</span>
            </span>
            <span className="font-light">
              {freeTrialDaysLeft === 0
                ? c('dashboard.trialCompleteBody', { level: safeLevel })
                : c('dashboard.trialActiveBody', { daysLeft: freeTrialDaysLeft, level: safeLevel })}
            </span>
          </div>
          <Link
            to="/wallet"
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary font-semibold font-mono text-[11px] rounded-full shadow-xs transition-all flex items-center gap-1.5 focus-ring btn-interactive cursor-pointer"
          >
            <span>{c('dashboard.trialDepositButton', { level: safeLevel })}</span>
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Welcome Header & Level Indicator */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline/50"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-[10px] tracking-widest text-primary uppercase font-semibold">
              {c('dashboard.workspaceTitle')}
            </span>
            <span className="font-mono text-[10px] text-text-muted">· {safeLevel} Cohort</span>
          </div>
          <h1 className="font-cormorant text-4xl md:text-5xl text-on-surface font-normal tracking-tight">
            {c('dashboard.welcome', { name: safeUser.name })}
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-1 font-light">
            {isFreeTrialMode ? (
              <span>
                {c('dashboard.trialPhase', { daysLeft: freeTrialDaysLeft || 7 })}:{' '}
                <strong className="font-mono text-xs text-primary font-semibold">
                  Trial Day {currentModuleDay} of 7
                </strong>
                {' '}(Main Track: {safeLevel})
              </span>
            ) : (
              <span>
                {c('dashboard.progressLine', { day: currentModuleDay, level: safeLevel })}
              </span>
            )}
          </p>
        </div>

        {/* Stat Mini-Cards */}
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-hairline/60 shadow-sm flex flex-col items-end min-w-[150px]">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{c('dashboard.vaultSecured')}</span>
            <span className="font-cormorant text-3xl text-primary font-medium mt-0.5 tabular-nums">
              {isFreeTrialMode ? 'ETB 0' : formatETB(safeWallet.stakedAmount)}
            </span>
            <span className="font-mono text-[10px] text-text-muted">{c('dashboard.riskExam')}</span>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-hairline/60 shadow-sm flex flex-col items-center justify-center min-w-[120px]">
            <div className="flex items-center gap-1.5 text-tertiary font-bold">
              <Flame size={20} />
              <span className="font-cormorant text-3xl text-on-surface font-medium tabular-nums">
                {isFreeTrialMode ? '—' : safeStreak.count}
              </span>
            </div>
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest mt-0.5">{c('dashboard.daysStreak')}</span>
          </div>
        </div>
      </motion.div>

      {/* Center Stage: Circular Gauge & Countdown Window */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-hairline/50 shadow-sm"
      >
        <div className="lg:col-span-4 flex flex-col items-center justify-center text-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle className="text-surface-container" cx="60" cy="60" fill="transparent" r="50" stroke="currentColor" strokeWidth="8" />
              <circle
                className="text-primary transition-all duration-1000 ease-out"
                cx="60"
                cy="60"
                fill="transparent"
                r="50"
                stroke="currentColor"
                strokeDasharray="314"
                strokeDashoffset={314 - (314 * progressPercent) / 100}
                strokeLinecap="round"
                strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-cormorant text-4xl text-on-surface font-normal tabular-nums">
                {completedTasksCount} / 3
              </span>
              <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider">Tasks Sealed</span>
            </div>
          </div>
          <span className="font-sans text-xs font-semibold text-on-surface mt-3">
            {completedTasksCount === 3 ? c('dashboard.allTasksSealed') : c('dashboard.tasksRemaining', { count: 3 - completedTasksCount })}
          </span>
          <span className="font-sans text-[11px] text-text-muted font-light">
            {c('dashboard.tasksRemainingBody')}
          </span>
        </div>

        <div className="lg:col-span-8 sm:col-span-8">
          <CountdownWidget />
        </div>
      </motion.div>

      {/* Day Completion Celebration & Next Day Unlock Banner */}
      {completedTasksCount === 3 && (
        <motion.div
          variants={itemVariants}
          className="p-5 sm:p-6 bg-surface-dark border border-stone-800 rounded-2xl text-stone-300 flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-success-green/15 text-success-green flex items-center justify-center shrink-0">
              <Sparkles size={26} />
            </div>
            <div>
              <span className="px-2.5 py-0.5 bg-success-green/15 text-success-green border border-success-green/30 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                <CheckCircle size={11} />
                {c('dashboard.dayMastered', { day: currentModuleDay })}
              </span>
              <h3 className="font-cormorant text-xl text-stone-100 font-normal mt-1">
                {c('dashboard.allTasksCompleted', { day: currentModuleDay })}
              </h3>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                {c('dashboard.daySecuredBody', { day: currentModuleDay, nextDay: currentModuleDay + 1 })}
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-surface-low border border-success-green/30 text-success-green font-mono text-xs font-semibold rounded-full flex items-center gap-2 shadow-xs shrink-0">
            <Lock size={14} />
            <span>{c('dashboard.nextDayUnlocks', { nextDay: currentModuleDay + 1 })}</span>
          </div>
        </motion.div>
      )}

      {/* 3 DAILY TASKS TRACKER */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline/50 pb-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-[10px] tracking-widest text-primary uppercase font-semibold">
                {c('dashboard.dailyMandate')}
              </span>
              <span className="font-mono text-[9px] bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant uppercase tracking-wider">
                ({c('dashboard.tasksCompletedCount', { count: completedTasksCount })})
              </span>
            </div>
            <h2 className="font-cormorant text-2xl sm:text-3xl text-on-surface font-normal">
              {c('dashboard.todaysTasks', { day: currentModuleDay })}
            </h2>
            <p className="font-sans text-xs text-on-surface-variant mt-0.5 font-light">
              {c('dashboard.streakRule', {})}
            </p>
          </div>

          {!isFreeTrialMode && (
            <span className="text-xs font-mono text-streak-orange font-bold bg-streak-orange/10 px-3.5 py-1.5 rounded-full border border-streak-orange/30 flex items-center gap-1.5 shadow-xs">
              <Flame size={15} className="text-streak-orange animate-pulse" />
              <span>Streak: {safeStreak.count} Days</span>
            </span>
          )}
        </div>

        {/* 3 Task Grid or Lock Overlay */}
        {isBalanceZero && !isFreeTrialMode ? (
          <div className="p-10 bg-warning-amber/10 border border-warning-amber/30 rounded-2xl text-center space-y-4 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-warning-amber/20 text-warning-amber flex items-center justify-center mx-auto">
              <Lock size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-cormorant text-2xl font-normal text-warning-amber">
                {c('dashboard.tasksLockedTitle')}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-lg mx-auto leading-relaxed font-light">
                {c('dashboard.tasksLockedBody')}
              </p>
            </div>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-full transition-all shadow-sm focus-ring btn-interactive mt-2 cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>{c('dashboard.topUpButton')}</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Task 1: Lesson Video */}
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-surface-container-lowest p-6 rounded-xl border border-hairline/50 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[9px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-wider">
                    {c('dashboard.task1Label')}
                  </span>
                  {safeDailyTasks.lesson ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary font-bold">
                      <CheckCircle size={14} />
                      SEALED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-tertiary font-semibold animate-pulse">
                      <AlertTriangle size={14} />
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
                <h4 className="font-cormorant text-2xl text-on-surface mb-2 font-medium">
                  {c('dashboard.watchLessonVideo')}
                </h4>
                <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                  Watch 100% of lecture video (seeking locked).
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline/50 flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-[10px] text-text-muted">
                  {safeDailyTasks.lesson ? c('dashboard.verifiedWatched') : c('dashboard.videoWorkspace')}
                </span>
                <Link
                  to="/workspaces"
                  className="px-4 py-2 rounded-full bg-primary text-on-primary font-sans text-xs font-medium hover:bg-primary-container transition-all btn-interactive focus-ring cursor-pointer"
                >
                  {safeDailyTasks.lesson ? "{c('dashboard.reviewLesson')}" : "{c('dashboard.openLesson')}"}
                </Link>
              </div>
            </motion.div>

            {/* Task 2: Listening Skill */}
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-surface-container-lowest p-6 rounded-xl border border-hairline/50 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[9px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-wider">
                    Task 2 · Listening Skill
                  </span>
                  {safeDailyTasks.video ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary font-bold">
                      <CheckCircle size={14} />
                      SEALED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-tertiary font-semibold animate-pulse">
                      <AlertTriangle size={14} />
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
                <h4 className="font-cormorant text-2xl text-on-surface mb-2 font-medium">
                  Listening Practice Video
                </h4>
                <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                  Watch Informative or Entertainment choice.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline/50 flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-[10px] text-text-muted">
                  {safeDailyTasks.video ? c('dashboard.comprehensionVerified') : c('dashboard.task2Title')}
                </span>
                <Link
                  to="/workspaces"
                  className="px-4 py-2 rounded-full bg-primary text-on-primary font-sans text-xs font-medium hover:bg-primary-container transition-all btn-interactive focus-ring cursor-pointer"
                >
                  {safeDailyTasks.video ? "{c('dashboard.replayAudio')}" : "{c('dashboard.watchVideo')}"}
                </Link>
              </div>
            </motion.div>

            {/* Task 3: Daily Exam */}
            <motion.div
              whileHover={{ y: -3 }}
              className="bg-surface-container-lowest p-6 rounded-xl border-2 border-primary/40 flex flex-col justify-between transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                    Task 3 · 20 Questions
                  </span>
                  {safeDailyTasks.exam ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary font-bold">
                      <CheckCircle size={14} />
                      SEALED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-tertiary font-semibold animate-pulse">
                      <AlertTriangle size={14} />
                      ACTION REQUIRED
                    </span>
                  )}
                </div>
                <h4 className="font-cormorant text-2xl text-on-surface mb-2 font-medium">
                  {c('dashboard.task3Title')}
                </h4>
                <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-light">
                  {c('dashboard.examScoreNote')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-hairline/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-destructive-red">{c('dashboard.riskLabel')}</span>
                  <Link
                    to="/exam"
                    className="px-4 py-2 rounded-full bg-primary text-on-primary font-sans text-xs font-medium hover:bg-primary-container transition-all btn-interactive focus-ring cursor-pointer"
                  >
                    {safeDailyTasks.exam ? "{c('dashboard.reviewExam')}" : "{c('dashboard.beginExam')}"}
                  </Link>
                </div>
                <Link
                  to="/exam/review"
                  className="block text-[11px] font-semibold text-on-surface-variant hover:text-primary font-mono focus-ring rounded p-0.5"
                >
                  Review my exam results →
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Feedback Card */}
      <motion.div
        variants={itemVariants}
        className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="font-cormorant text-xl font-normal text-on-surface">{c('dashboard.feedbackTitle')}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5 font-light">
              Help us improve Ethio-Lingo — tell us what you think about the lessons, videos, and exam experience.
            </p>
          </div>
        </div>
        <Link
          to="/feedback"
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-medium rounded-full transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
        >
          <MessageSquare size={15} />
          <span>{c('dashboard.submitFeedback')}</span>
        </Link>
      </motion.div>

      {/* Top Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Active Stake & Escrow Health */}
        <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
              Locked Vault Escrow
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>

          <div className="font-cormorant text-3xl sm:text-4xl font-medium text-primary tracking-tight tabular-nums">
            {isFreeTrialMode ? 'ETB 0 (Free Trial)' : formatETB(safeWallet.stakedAmount)}
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-3 border-t border-hairline/50 gap-2 flex-wrap">
            <span className="font-light">
              Penalty Rules:{' '}
              <strong className="font-mono text-destructive-red">
                ETB 25 exam fail • ETB 80 missed day
              </strong>
            </span>
            <Link
              to="/wallet"
              className="text-primary font-semibold flex items-center gap-1 hover:underline font-mono focus-ring rounded p-0.5"
            >
              Vault <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Continuous Streak & Today's Status */}
        <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
              Daily Accountability Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-streak-orange/15 text-streak-orange flex items-center justify-center">
              <Flame size={18} />
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-cormorant text-3xl sm:text-4xl font-medium text-streak-orange tracking-tight tabular-nums">
              {isFreeTrialMode ? 'N/A' : `${safeStreak.count} DAYS`}
            </span>
            {!isFreeTrialMode && (
              <span className="text-xs font-semibold text-success-green bg-success-green/10 border border-success-green/30 px-2.5 py-0.5 rounded-full">
                Active Streak 🔥
              </span>
            )}
          </div>

          {completedTasksCount < 3 ? (
            <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-destructive-red flex items-center gap-2 font-mono">
              <ShieldAlert size={16} className="shrink-0" />
              <span>
                {3 - completedTasksCount} task(s) remaining today to protect your stake!
              </span>
            </div>
          ) : (
            <div className="p-3 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green flex items-center gap-2 font-mono">
              <CheckCircle size={16} className="shrink-0" />
              <span>{c('dashboard.streakSuccessToast')}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LearnerDashboard;