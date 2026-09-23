import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flame,
  ShieldAlert,
  BookOpen,
  ArrowUpRight,
  Wallet,
  CheckCircle,
  Play,
  Award,
  Video,
  AlertTriangle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Lock,
  Megaphone,
  X,
  MessageSquare,
} from "lucide-react";
import { useStaking } from "../../context/StakingContext";
import { formatETB } from "../../utils/formatters";
import { api } from "../../services/api";
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
    dailyTasks,
    isBalanceZero,
    isFreeTrialMode,
    freeTrialDaysLeft,
    advanceToNextDay,
  } = useStaking();

  const safeDailyTasks = dailyTasks || { lesson: false, video: false, exam: false };
  const safeWallet = wallet || { stakedAmount: 0, yieldBalance: 0, totalPenalties: 0, totalPlatformFees: 0 };
  const safeUser = user || { name: '', level: 'Beginner I' };
  const safeStreak = streak || { count: 0 };

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

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let mounted = true;
    let dismissed = [];
    try {
      dismissed = JSON.parse(localStorage.getItem('ethiolingo_dismissed_announcements') || '[]');
    } catch (e) {
      dismissed = [];
    }
    api.getAnnouncements()
      .then((res) => {
        if (mounted && res && res.success && Array.isArray(res.data)) {
          const ids = new Set(dismissed);
          setAnnouncements(res.data.filter((a) => !ids.has(a.id)));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const dismissAnnouncement = (id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    let dismissed = [];
    try {
      dismissed = JSON.parse(localStorage.getItem('ethiolingo_dismissed_announcements') || '[]');
    } catch (e) {
      dismissed = [];
    }
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      try {
        localStorage.setItem('ethiolingo_dismissed_announcements', JSON.stringify(dismissed));
      } catch (e) {}
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors duration-250"
    >
      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          {announcements.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-5 bg-gradient-to-r from-primary-coral/15 via-surface-card to-surface-card border border-primary-coral/30 rounded-2xl flex items-start justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-coral/20 text-primary-coral flex items-center justify-center shrink-0">
                  <Megaphone size={17} />
                </div>
                <div>
                  {a.title && (
                    <h3 className="font-serif font-bold text-sm text-on-surface">{a.title}</h3>
                  )}
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {a.content || a.message || ''}
                  </p>
                  {a.createdAt && (
                    <p className="text-[10px] font-mono text-on-surface-variant/70 mt-1.5">
                      Announcement • {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismissAnnouncement(a.id)}
                className="p-1.5 text-on-surface-variant hover:text-destructive-red rounded-lg cursor-pointer focus-ring shrink-0"
                aria-label="Dismiss announcement"
                title="Dismiss"
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Insufficient / Zero Balance Alert Banner */}
      {isBalanceZero && !isFreeTrialMode && (
        <motion.div
          variants={itemVariants}
          className="p-4 sm:p-5 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-amber-900 dark:text-amber-200">
                Curriculum Paused — Escrow Stake Balance (0 ETB)
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                Your escrow stake balance is 0 ETB. Please submit your deposit verification to reactivate your curriculum tasks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="px-4 py-2.5 bg-primary-coral hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs focus-ring btn-interactive"
            >
              <PlusCircle size={15} />
              <span>Submit Stake Deposit</span>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Free Trial Banner */}
      {isFreeTrialMode && (
        <motion.div
          variants={itemVariants}
          className="p-4 bg-surface-card border border-hairline rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant"
        >
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1 text-white font-mono text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 ${
              freeTrialDaysLeft === 0 ? 'bg-amber-600' : 'bg-primary-coral'
            }`}>
              <Sparkles size={12} />
              <span>{freeTrialDaysLeft === 0 ? 'FREE TRIAL COMPLETE' : '3-DAY FREE TRIAL ACTIVE'}</span>
            </span>
            <span>
              {freeTrialDaysLeft === 0
                ? `You have completed your 3-day free trial! Deposit 1,000 ETB to unlock Day 1 of ${safeUser.level}.`
                : `You are exploring the dedicated 3-day free trial curriculum (${freeTrialDaysLeft} Days Left). Target Staked Track: ${safeUser.level}.`}
            </span>
          </div>
          <Link
            to="/wallet"
            className="px-3.5 py-2 bg-primary-coral hover:bg-primary-hover text-white font-semibold font-mono text-[11px] rounded-xl shadow-xs transition-all flex items-center gap-1.5 focus-ring cursor-pointer"
          >
            <span>Deposit ETB 1,000 to Start Day 1 of {safeUser.level}</span>
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Welcome Header & Level Indicator */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-primary-coral uppercase tracking-wider font-semibold">
              Learner Portal
            </span>
            <span className="px-3 py-0.5 bg-surface-dark text-warning-amber font-mono text-[10px] font-bold rounded-full uppercase flex items-center gap-1 border border-stone-800">
              <Award size={12} />
              <span>Target Level: {safeUser.level}</span>
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-1 tracking-tight">
            Welcome back, {safeUser.name}
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-1">
            {isFreeTrialMode ? (
              <span>Free Trial Phase ({freeTrialDaysLeft || 3} Days Left): <strong className="text-primary-coral">Trial Day {currentModuleDay} of 3</strong> (Main Track: {safeUser.level})</span>
            ) : (
              <span>30-Day Curriculum Progress: <strong className="text-primary-coral">Day {currentModuleDay} of 30</strong> ({safeUser.level})</span>
            )}
          </p>
        </div>

        {/* Level Progress Indicator */}
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-4 shadow-xs flex items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="18" className="stroke-hairline" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="18"
                className="stroke-primary-coral transition-all duration-500 ease-out"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={113}
                strokeDashoffset={113 - (113 * progressPercent) / 100}
              />
            </svg>
            <span className="absolute text-[11px] font-mono font-bold text-on-surface">
              {completedTasksCount}/3
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-primary-coral uppercase block">Daily Requirement</span>
            <span className="text-xs font-semibold text-on-surface">
              {completedTasksCount === 3 ? 'All 3 Tasks Completed ✓' : `${3 - completedTasksCount} Task(s) Remaining`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Real-time Countdown Timer */}
      <motion.div variants={itemVariants}>
        <CountdownWidget />
      </motion.div>

      {/* Day Completion Celebration & Next Day Unlock Banner */}
      {completedTasksCount === 3 && (
        <motion.div
          variants={itemVariants}
          className="p-5 bg-gradient-to-r from-emerald-900/90 to-green-950 border-2 border-emerald-500/40 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles size={26} />
            </div>
            <div>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold rounded uppercase tracking-wider">
                DAY {currentModuleDay} MASTERED
              </span>
              <h3 className="font-serif font-bold text-lg text-white mt-1">
                All 3 Tasks Completed! Day {currentModuleDay} Secured
              </h3>
              <p className="text-xs text-emerald-200/80 font-mono mt-0.5">
                Your daily stake is safe and streak is protected. Day {currentModuleDay + 1} unlocks when the midnight countdown reaches zero.
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-emerald-900/80 border border-emerald-600/40 text-emerald-200 font-mono text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs shrink-0">
            <Lock size={14} />
            <span>Day {currentModuleDay + 1} Unlocks at Midnight</span>
          </div>
        </motion.div>
      )}

      {/* 3 DAILY TASKS TRACKER CARD */}
      <motion.div
        variants={itemVariants}
        className="bg-surface-lowest border-2 border-primary-coral/30 rounded-2xl p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-4">
          <div>
            <h2 className="font-serif font-bold text-xl text-on-surface flex items-center gap-2">
              <span>Day {currentModuleDay}: Today's 3 Mandatory Tasks</span>
              <span className="text-xs font-mono font-normal text-on-surface-variant bg-surface-soft px-2.5 py-0.5 rounded-full border border-primary-coral/20">
                ({completedTasksCount} / 3 Completed)
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Continuous daily streak increments <strong>only when all 3 tasks are completed</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isFreeTrialMode && (
              <span className="text-xs font-mono text-streak-orange font-bold bg-orange-500/10 px-3.5 py-1.5 rounded-full border border-orange-500/30 flex items-center gap-1.5 shadow-2xs">
                <Flame size={15} className="text-streak-orange animate-pulse" />
                <span>Streak: {safeStreak.count} Days</span>
              </span>
            )}
          </div>
        </div>

        {/* 3 Task Grid or Lock Overlay */}
        {isBalanceZero && !isFreeTrialMode ? (
          <div className="p-8 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl text-center space-y-4 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-warning-amber flex items-center justify-center mx-auto shadow-inner">
              <Lock size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-xl text-amber-900 dark:text-amber-200">
                Daily Learning Tasks Locked (0 ETB Stake)
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 max-w-lg mx-auto leading-relaxed">
                Your curriculum tasks are locked because your active escrow stake balance is 0 ETB. Submit a stake deposit of 1,000 ETB to reactivate daily lecture videos and exams.
              </p>
            </div>
            <Link
              to="/wallet"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-coral hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-sm focus-ring btn-interactive mt-2 cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>Top Up 1,000 ETB Stake in Escrow Vault →</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Task 1: Lesson Video */}
            <motion.div
              whileHover={{ y: -3 }}
              className={`p-4 rounded-xl border transition-all ${
                safeDailyTasks.lesson
                  ? "bg-green-500/10 border-green-500/40 text-on-surface"
                  : "bg-canvas border-hairline hover:border-primary-coral"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-primary-coral uppercase tracking-wider">
                  TASK 1
                </span>
                {safeDailyTasks.lesson ? (
                  <CheckCircle size={20} className="text-success-green" />
                ) : (
                  <Video size={20} className="text-on-surface-variant" />
                )}
              </div>
              <h3 className="font-serif font-bold text-sm text-on-surface">
                Watch Lesson Video
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                Watch 100% of lecture video (seeking locked).
              </p>
              <Link
                to="/workspaces"
                className="inline-block mt-3 text-xs font-semibold text-primary-coral hover:underline font-mono focus-ring rounded p-0.5"
              >
                {safeDailyTasks.lesson ? "Completed ✓" : "Open Lesson →"}
              </Link>
            </motion.div>

            {/* Task 2: Listening Skill */}
            <motion.div
              whileHover={{ y: -3 }}
              className={`p-4 rounded-xl border transition-all ${
                safeDailyTasks.video
                  ? "bg-green-500/10 border-green-500/40 text-on-surface"
                  : "bg-canvas border-hairline hover:border-primary-coral"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-primary-coral uppercase tracking-wider">
                  TASK 2
                </span>
                {safeDailyTasks.video ? (
                  <CheckCircle size={20} className="text-success-green" />
                ) : (
                  <Play size={20} className="text-on-surface-variant" />
                )}
              </div>
              <h3 className="font-serif font-bold text-sm text-on-surface">
                Listening Practice Video
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                Watch Informative or Entertainment choice.
              </p>
              <Link
                to="/workspaces"
                className="inline-block mt-3 text-xs font-semibold text-primary-coral hover:underline font-mono focus-ring rounded p-0.5"
              >
                {safeDailyTasks.video ? "Completed ✓" : "Watch Video →"}
              </Link>
            </motion.div>

            {/* Task 3: Daily Exam */}
            <motion.div
              whileHover={{ y: -3 }}
              className={`p-4 rounded-xl border transition-all ${
                safeDailyTasks.exam
                  ? "bg-green-500/10 border-green-500/40 text-on-surface"
                  : "bg-canvas border-hairline hover:border-primary-coral"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-primary-coral uppercase tracking-wider">
                  TASK 3
                </span>
                {safeDailyTasks.exam ? (
                  <CheckCircle size={20} className="text-success-green" />
                ) : (
                  <BookOpen size={20} className="text-on-surface-variant" />
                )}
              </div>
              <h3 className="font-serif font-bold text-sm text-on-surface">
                20-Question Daily Exam
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                Score (15/20) (75%) to pass.
              </p>
              <Link
                to="/exam"
                className="inline-block mt-3 text-xs font-semibold text-primary-coral hover:underline font-mono focus-ring rounded p-0.5"
              >
                {safeDailyTasks.exam ? "Completed ✓" : "Start Daily Exam →"}
              </Link>
              <Link
                to="/exam/review"
                className="block mt-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary-coral hover:underline font-mono focus-ring rounded p-0.5"
              >
                Review my exam results →
              </Link>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Feedback Card */}
      <motion.div
        variants={itemVariants}
        className="bg-surface-lowest border border-hairline rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-coral/10 text-primary-coral flex items-center justify-center shrink-0">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-on-surface">Share Your Feedback</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Help us improve Ethio-Lingo — tell us what you think about the lessons, videos, and exam experience.
            </p>
          </div>
        </div>
        <Link
          to="/feedback"
          className="px-5 py-3 bg-primary-coral hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
        >
          <MessageSquare size={15} />
          <span>Submit Feedback</span>
        </Link>
      </motion.div>

      {/* Top Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Active Stake & Escrow Health */}
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-bold">
              Locked Vault Escrow
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary-coral/10 text-primary-coral flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>

          <div className="font-mono text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
            {isFreeTrialMode ? 'ETB 0 (Free Trial)' : formatETB(safeWallet.stakedAmount)}
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-hairline">
            <span>
              Penalty Rules:{" "}
              <strong className="font-mono text-destructive-red">
                ETB 25 exam fail • ETB 80 missed day
              </strong>
            </span>
            <Link
              to="/wallet"
              className="text-primary-coral font-semibold flex items-center gap-1 hover:underline font-mono focus-ring rounded p-0.5"
            >
              Vault <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Continuous Streak & Today's Status */}
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider font-bold">
              Daily Accountability Streak
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-streak-orange flex items-center justify-center">
              <Flame size={18} />
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-streak-orange tracking-tight">
              {isFreeTrialMode ? 'N/A' : `${safeStreak.count} DAYS`}
            </span>
            {!isFreeTrialMode && (
              <span className="text-xs font-semibold text-success-green bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                Active Streak 🔥
              </span>
            )}
          </div>

          {completedTasksCount < 3 ? (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2 font-mono">
              <ShieldAlert size={16} className="shrink-0 text-destructive-red" />
              <span>
                {3 - completedTasksCount} task(s) remaining today to protect your stake!
              </span>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-green-700 dark:text-green-300 flex items-center gap-2 font-mono">
              <CheckCircle size={16} className="shrink-0 text-success-green" />
              <span>All 3 daily tasks complete! Streak advanced today.</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LearnerDashboard;
