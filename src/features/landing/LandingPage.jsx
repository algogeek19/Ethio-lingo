import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Flame,
  Lock,
  ArrowRight,
  Video,
  Play,
  BookOpen,
  Sparkles,
  Clock,
  ChevronRight,
} from 'lucide-react';
import HorizontalScrollGallery from './HorizontalScrollGallery';
import { useRole } from '../../context/RoleContext';
import { api } from '../../services/api';

/**
 * 💡 CONFIGURE VIA ENVIRONMENT VARIABLE OR DIRECT FALLBACK:
 * Set `VITE_LANDING_VIDEO_URL` in your hosting environment variables (e.g. Render / Vercel)
 * to any full YouTube link or 11-character video ID without needing code changes.
 */
export const EXPLAINER_YOUTUBE_VIDEO_ID =
  import.meta.env.VITE_LANDING_VIDEO_URL ||
  import.meta.env.VITE_YOUTUBE_EXPLAINER_URL ||
  'dQw4w9WgXcQ';

// Helper to extract YouTube video ID from URL or return raw ID
const getYouTubeVideoId = (input) => {
  if (!input) return 'dQw4w9WgXcQ';
  const str = String(input).trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = str.match(regExp);
  return match && match[2].length === 11 ? match[2] : str;
};

// Smooth exponential ease-out kinetic counter
const AnimatedCounter = ({ from = 0, to, duration = 1.4, prefix = '', suffix = '' }) => {
  const nodeRef = useRef(null);
  const isInView = useInView(nodeRef, { once: true, margin: '-20px' });
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    if (!isInView) return;
    let startTime;
    let animationFrame;

    const updateCount = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(from + (to - from) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCount);
      } else {
        setDisplayValue(to);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, from, to, duration]);

  return (
    <span ref={nodeRef} className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

const easeCustom = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeCustom },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeCustom,
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: easeCustom },
  },
};

const LandingPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, role } = useRole();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [rawVideoUrl, setRawVideoUrl] = useState(EXPLAINER_YOUTUBE_VIDEO_ID);

  useEffect(() => {
    let isMounted = true;
    api.getLandingVideoSetting()
      .then((res) => {
        if (isMounted && res?.data?.videoUrl) {
          setRawVideoUrl(res.data.videoUrl);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const videoId = getYouTubeVideoId(rawVideoUrl);

  const targetAuthRoute = isAuthenticated
    ? (role === 'admin' ? '/admin' : '/dashboard')
    : '/auth';

  return (
    <div className="relative space-y-28 py-8 overflow-hidden transition-colors duration-250">
      {/* Ambient background illumination */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-primary-coral/10 via-warning-amber/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-4 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 max-w-5xl mx-auto"
        >
          {/* Eyebrow badge with pulse */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-soft border border-hairline rounded-full text-xs font-mono text-primary-coral shadow-2xs"
          >
            <Flame size={15} className="text-streak-orange animate-pulse" />
            <span className="font-bold">{t('hero.badge', 'FINANCIAL ACCOUNTABILITY & HABIT-BUILDING PLATFORM')}</span>
          </motion.div>

          {/* Masthead */}
          <motion.h1
            variants={itemVariants}
            className="font-serif font-bold text-4xl sm:text-6xl lg:text-7xl text-on-surface tracking-tight leading-[1.1]"
          >
            {t('hero.title', 'Master English Through Real Financial Commitment.')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-xl text-on-surface-variant max-w-3xl mx-auto font-sans leading-relaxed"
          >
            {t('hero.description', 'Ethio-Lingo combines structured English online learning across 6 curriculum levels with a Financial Escrow Staking Engine. Lock your stake, complete 4 daily tasks, pass the 20-question exam, and protect your capital.')}
          </motion.p>

          {/* Primary CTA */}
          <motion.div variants={itemVariants} className="pt-4 flex justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={targetAuthRoute}
                className="px-9 py-4 bg-primary-coral hover:bg-primary-hover active:bg-primary-coral/80 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2.5 group focus-ring btn-interactive"
              >
                <span>{isAuthenticated ? t('common.goToDashboard', 'Go to Dashboard') : t('common.createAccount', 'Create Account & Take Placement Quiz')}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-200" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Live Staking Counter Banner with Kinetic Digits */}
          <motion.div
            variants={itemVariants}
            className="mt-16 p-6 sm:p-8 bg-surface-dark text-white rounded-3xl max-w-4xl mx-auto shadow-2xl border border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center backdrop-blur-md relative overflow-hidden"
          >
            {/* Subtle sheen highlight across the top */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-500/30 to-transparent" />

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-warning-amber">
                <AnimatedCounter from={0} to={1000} prefix="ETB " suffix={` ${t('common.stake', 'Stake')}`} />
              </div>
              <div className="text-[11px] text-stone-400 font-sans uppercase tracking-wider font-bold">{t('hero.stakeBanner.stakeSub', '0% Fee • 1,000 ETB Fully Locked')}</div>
            </div>

            <div className="space-y-1 sm:border-x border-stone-800">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-success-green">
                <AnimatedCounter from={0} to={6} suffix={` ${t('common.level', 'Levels')}`} />
              </div>
              <div className="text-[11px] text-stone-400 font-sans uppercase tracking-wider font-bold">{t('hero.stakeBanner.levelsSub', 'Beginner I to Advanced II')}</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-mono font-bold text-streak-orange">
                <AnimatedCounter from={0} to={3} suffix={` ${t('tasks.sectionBadge', 'Daily Tasks')}`} />
              </div>
              <div className="text-[11px] text-stone-400 font-sans uppercase tracking-wider font-bold">{t('hero.stakeBanner.tasksSub', 'Lesson, Listening & Daily Exam')}</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* SEE HOW Ethio-Lingo WORKS — EXPLAINER VIDEO SHOWCASE SECTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="space-y-10"
        >
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1 bg-surface-card border border-hairline text-primary-coral font-mono text-xs font-bold rounded-full uppercase shadow-2xs">
              <Sparkles size={14} className="text-warning-amber" />
              <span>{t('videoShowcase.badge', 'PLATFORM WALKTHROUGH')}</span>
            </motion.div>
            <motion.h2 variants={itemVariants} className="font-serif font-bold text-3xl sm:text-5xl text-on-surface tracking-tight">
              {t('videoShowcase.title', 'See How Ethio-Lingo Works in few Minutes')}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              {t('videoShowcase.description', 'Watch how our daily 3-task curriculum and financial escrow vault keep you accountable, build unbreakable habits, and help you master English.')}
            </motion.p>
          </div>

          {/* Interactive 16:9 Video Player Card */}
          <motion.div
            variants={itemVariants}
            className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-stone-800/70 via-stone-900/90 to-surface-dark border border-stone-800 shadow-2xl overflow-hidden group transition-all duration-300 hover:border-stone-700"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-coral/20 via-warning-amber/15 to-primary-coral/20 rounded-3xl blur-xl opacity-40 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none" />

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-stone-950 shadow-inner">
              {isVideoPlaying ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
                  title="Ethio-Lingo Platform Walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <div
                  onClick={() => setIsVideoPlaying(true)}
                  className="relative w-full h-full cursor-pointer group/poster flex items-center justify-center overflow-hidden"
                >
                  {/* YouTube Maxres Thumbnail Background */}
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Ethio-Lingo Platform Explainer Video"
                    onError={(e) => {
                      e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                    className="absolute inset-0 w-full h-full object-cover transform scale-100 group-hover/poster:scale-105 transition-transform duration-700 ease-out brightness-75 group-hover/poster:brightness-90"
                  />

                  {/* Gradient Overlay for Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-stone-950/40" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
                    <span className="px-3 py-1 bg-stone-900/85 backdrop-blur-md border border-stone-700/80 text-white font-mono text-[11px] font-bold rounded-lg uppercase flex items-center gap-1.5 shadow-md">
                      <Clock size={13} className="text-warning-amber" />
                      <span>{t('videoShowcase.duration', 'FEW MINUTE WALKTHROUGH')}</span>
                    </span>
                  </div>

                  {/* Center Glowing Play Button */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-20 h-20 sm:w-24 sm:h-24 bg-primary-coral/40 rounded-full animate-ping opacity-70 pointer-events-none" />
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-coral hover:bg-primary-hover active:scale-95 text-white rounded-full flex items-center justify-center shadow-xl shadow-primary-coral/40 transition-all duration-300 group-hover/poster:scale-110">
                        <Play size={28} className="text-white fill-white ml-1" />
                      </div>
                    </div>
                    <span className="text-white text-xs sm:text-sm font-semibold tracking-wide bg-stone-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-stone-700/80 shadow-lg group-hover/poster:border-primary-coral/60 transition-colors">
                      {t('videoShowcase.clickToWatch', 'Click to Watch Video')}
                    </span>
                  </div>

                  {/* Bottom Captions */}
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-none">
                    <span className="text-xs sm:text-sm font-medium text-stone-200 line-clamp-1 drop-shadow-md">
                      {t('videoShowcase.caption', 'Complete Walkthrough: Staking, Daily Practice & Withdrawal')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 3 Key Takeaways Reinforcement Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div
              whileHover={{ y: -3 }}
              className="p-5 bg-surface-lowest border border-hairline rounded-2xl space-y-2 hover:border-primary-coral/50 transition-all shadow-xs flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-warning-amber flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-on-surface">{t('videoShowcase.takeaway1Title', '1. Lock Escrow Stake')}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('videoShowcase.takeaway1Desc', 'Deposit 1,000 ETB once into your secure vault to activate 30 days of daily learning.')}
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="p-5 bg-surface-lowest border border-hairline rounded-2xl space-y-2 hover:border-primary-coral/50 transition-all shadow-xs flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-coral/15 border border-primary-coral/30 text-primary-coral flex items-center justify-center shrink-0">
                <Flame size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-on-surface">{t('videoShowcase.takeaway2Title', '2. Complete Your Daily Tasks')}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('videoShowcase.takeaway2Desc', 'Lesson video, listening practice, and a daily exam. Advance your streak and build lasting study habits.')}
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="p-5 bg-surface-lowest border border-hairline rounded-2xl space-y-2 hover:border-primary-coral/50 transition-all shadow-xs flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 text-success-green flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-base text-on-surface">{t('videoShowcase.takeaway3Title', '3. Protect & Withdraw')}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('videoShowcase.takeaway3Desc', 'Pass your daily modules to protect 100% of your stake and withdraw directly to your account.')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* GSAP HORIZONTAL SCROLL GALLERY SECTION */}
      <section>
        <HorizontalScrollGallery />
      </section>

      {/* 4 MANDATORY DAILY WORKSPACE TASKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="space-y-12"
        >
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <motion.span variants={itemVariants} className="px-3.5 py-1 bg-surface-card border border-hairline text-primary-coral font-mono text-xs font-bold rounded-full uppercase">
              {t('tasks.sectionBadge', 'DAILY LEARNING WORKSPACES')}
            </motion.span>
            <motion.h2 variants={itemVariants} className="font-serif font-bold text-3xl sm:text-4xl text-on-surface tracking-tight">
              {t('tasks.title', 'The 3 Daily Learning Tasks')}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              {t('tasks.description', 'Every day, learners complete the lesson video and listening practice, then pass the daily exam to advance their streak and protect their money.')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Task 1 */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-surface-lowest border border-hairline rounded-2xl space-y-4 hover:border-primary-coral transition-all flex flex-col justify-between shadow-xs relative group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary-coral text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                  01
                </div>
                <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                  <Video size={18} className="text-primary-coral" />
                  <span>{t('tasks.task1Title', 'Task 1: Lesson Video')}</span>
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('tasks.task1Desc', 'Watch the daily educational YouTube lecture. Seeking is locked; video must be watched for 100% duration to mark completed. Includes downloadable PDF reference book.')}
                </p>
              </div>
              <span className="text-[10px] font-mono text-primary-coral font-bold uppercase tracking-wider">{t('tasks.task1Badge', 'SEEK-LOCKED • 100% DURATION')}</span>
            </motion.div>

            {/* Task 2 */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-surface-lowest border border-hairline rounded-2xl space-y-4 hover:border-primary-coral transition-all flex flex-col justify-between shadow-xs relative group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-surface-dark text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs border border-stone-800 group-hover:scale-105 transition-transform">
                  02
                </div>
                <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                  <Play size={18} className="text-primary-coral" />
                  <span>{t('tasks.task2Title', 'Task 2: Listening Skill')}</span>
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('tasks.task2Desc', 'Choose between Informative or Educational Entertainment YouTube videos based on learner preference. Seeking locked, 100% duration required.')}
                </p>
              </div>
              <span className="text-[10px] font-mono text-primary-coral font-bold uppercase tracking-wider">{t('tasks.task2Badge', 'INFORMATIVE OR ENTERTAINMENT')}</span>
            </motion.div>

            {/* Task 3 */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -5 }}
              className="p-6 bg-surface-lowest border border-hairline rounded-2xl space-y-4 hover:border-primary-coral transition-all flex flex-col justify-between shadow-xs relative group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-streak-orange text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                  03
                </div>
                <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                  <BookOpen size={18} className="text-streak-orange" />
                  <span>{t('tasks.task3Title', 'Task 3: Daily Exam')}</span>
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {t('tasks.task3Desc', 'Unlocks only after Task 1 and Task 2 are completed. Take a 20-question multiple-choice exam. Score ≥15/20 (75%) to pass and advance to the next module.')}
                </p>
              </div>
              <span className="text-[10px] font-mono text-streak-orange font-bold uppercase tracking-wider">{t('tasks.task3Badge', '20 QUESTIONS • PASS ≥ 15/20')}</span>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 6 CURRICULUM LEVELS ROADMAP */}
      <section className="bg-surface-soft py-16 border-y border-hairline relative">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12"
        >
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <motion.span variants={itemVariants} className="text-xs font-mono font-bold text-primary-coral uppercase">
              {t('levels.sectionBadge', 'STRUCTURED PROGRESSION TRACK')}
            </motion.span>
            <motion.h2 variants={itemVariants} className="font-serif font-bold text-3xl sm:text-4xl text-on-surface">
              {t('levels.title', '6 Levels of Comprehensive Curriculum')}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-on-surface-variant text-sm">
              {t('levels.description', 'Each level consists of 30 daily modules. Take the 10-question placement quiz to start in Beginner I or Intermediate I.')}
            </motion.p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { level: 'Beginner I', desc: 'Foundations & Grammar', modules: '30 Modules' },
              { level: 'Beginner II', desc: 'Elementary Tenses', modules: '30 Modules' },
              { level: 'Intermediate I', desc: 'Academic Listening', modules: '30 Modules' },
              { level: 'Intermediate II', desc: 'Business & Economics', modules: '30 Modules' },
              { level: 'Advanced I', desc: 'Critical Essay Analysis', modules: '30 Modules' },
              { level: 'Advanced II', desc: 'Literature & Synthesis', modules: '30 Modules' },
            ].map((item, idx) => (
              <motion.div
                key={item.level}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-surface-lowest border border-hairline rounded-2xl p-4 text-center space-y-2 hover:border-primary-coral transition-all shadow-xs group"
              >
                <span className="px-2.5 py-0.5 bg-surface-card text-primary-coral font-mono text-[10px] font-bold rounded-lg uppercase group-hover:bg-primary-coral group-hover:text-white transition-colors">
                  LEVEL {idx + 1}
                </span>
                <h3 className="font-serif font-bold text-base text-on-surface">{item.level}</h3>
                <p className="text-[11px] text-on-surface-variant">{item.desc}</p>
                <span className="text-[10px] font-mono text-text-muted block pt-2 border-t border-hairline">
                  {item.modules}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ESCROW STAKING & SLASHING MECHANICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="space-y-12"
        >
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <motion.span variants={itemVariants} className="px-3.5 py-1 bg-surface-card border border-hairline text-primary-coral font-mono text-xs font-bold rounded-full uppercase">
              {t('staking.sectionBadge', 'FINANCIAL ESCROW ENGINE')}
            </motion.span>
            <motion.h2 variants={itemVariants} className="font-serif font-bold text-3xl sm:text-4xl text-on-surface">
              {t('staking.title', 'How Staking & Protection Work')}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-on-surface-variant text-base">
              {t('staking.description', 'Money locked in escrow enforces daily habit building. Pass daily tasks and exams to protect 100% of your staked capital.')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-3 shadow-xs hover:border-primary-coral/60 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-coral text-white flex items-center justify-center shadow-xs">
                <Lock size={20} />
              </div>
              <h3 className="font-serif font-bold text-lg text-on-surface">{t('staking.depositTitle', '1,000 ETB Initial Deposit')}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t('staking.depositDesc', 'Deposit 1,000 ETB via Telebirr or Ethiopian Bank Transfer. With a 0% platform fee, your full 1,000 ETB is locked in your escrow vault.')}
              </p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-3 shadow-xs hover:border-destructive-red/60 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-destructive-red text-white flex items-center justify-center shadow-xs">
                <Flame size={20} />
              </div>
              <h3 className="font-serif font-bold text-lg text-on-surface">{t('staking.penaltyTitle', 'Slashing Penalty Mechanics')}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t('staking.penaltyDesc', 'Failing an exam attempt slashes 25 ETB. Missing a 24-hour day window slashes 80 ETB, resets streak to 0, and forces module repeat.')}
              </p>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4 }}
              className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-3 shadow-xs hover:border-success-green/60 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-success-green text-white flex items-center justify-center shadow-xs">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-serif font-bold text-lg text-on-surface">{t('staking.withdrawalTitle', 'Withdrawal at Level End')}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t('staking.withdrawalDesc', 'Upon completing a 30-day level, submit bank / Telebirr details to request manual withdrawal approval, or continue to the next level if stake > 100 ETB.')}
              </p>
            </motion.div>
          </div>

          {/* Free Trial Option Card */}
          <motion.div
            variants={cardVariants}
            className="p-6 bg-surface-lowest border border-hairline rounded-3xl flex flex-wrap items-center justify-between gap-6 max-w-4xl mx-auto shadow-sm hover:border-primary-coral/50 transition-all"
          >
            <div className="space-y-1">
              <span className="px-3 py-1 bg-primary-coral text-white font-mono text-[10px] font-bold rounded-lg uppercase">
                {t('staking.trialBadge', '3-DAY FREE TRIAL AVAILABLE')}
              </span>
              <h4 className="font-serif font-bold text-lg text-on-surface">
                {t('staking.trialTitle', 'Want to try Ethio-Lingo before staking money?')}
              </h4>
              <p className="text-xs text-on-surface-variant">
                {t('staking.trialDesc', 'Try 3 free preview modules without financial stake or streak penalties. Upgrade anytime to the paid tier!')}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={targetAuthRoute}
                className="px-6 py-3 bg-surface-dark hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition-all shadow-xs shrink-0 focus-ring btn-interactive inline-flex items-center gap-1.5"
              >
                <span>{isAuthenticated ? t('common.goToDashboard', 'Go to Dashboard') : t('common.startFreeTrial', 'Start 3-Day Free Trial')}</span>
                <ChevronRight size={14} />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: easeCustom }}
          className="bg-surface-dark text-white rounded-3xl p-10 sm:p-14 shadow-2xl space-y-6 border border-stone-800 relative overflow-hidden"
        >
          {/* Subtle glowing corner highlight */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-coral/20 rounded-full blur-2xl pointer-events-none" />

          <h2 className="font-serif font-bold text-3xl sm:text-5xl text-white tracking-tight relative z-10">
            {t('cta.title', 'Ready to Build Daily Study Discipline?')}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed relative z-10">
            {t('cta.description', 'Join Ethio-Lingo, take the 10-question placement test, choose your stake or free trial, and master English step-by-step.')}
          </p>
          <div className="pt-4 flex justify-center relative z-10">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={targetAuthRoute}
                className="px-9 py-4 bg-primary-coral hover:bg-primary-hover text-white font-bold rounded-2xl shadow-lg transition-all text-sm sm:text-base inline-flex items-center gap-2 focus-ring btn-interactive"
              >
                <span>{isAuthenticated ? t('common.goToDashboard', 'Go to Dashboard') : t('common.getStarted', 'Get Started Now')}</span>
                <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;
