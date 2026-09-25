import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Play,
  BookOpen,
  Sparkles,
  Flame,
  ShieldAlert,
  Banknote,
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

/* ---- Softer, calmer editorial motion language -------------------------- */

const easeEditorial = [0.22, 1, 0.36, 1];

const heroContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeEditorial },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: easeEditorial, staggerChildren: 0.09 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeEditorial },
  },
};

const METHOD_STEPS = [
  {
    num: '01',
    tag: 'Diagnostic',
    title: '10-Question Placement',
    body: 'Algorithmic grammar assessment benchmarks your exact tier: Beginner I through Advanced II. Zero guesswork.',
    footLeft: 'Score <8: Beginner I',
    footRight: 'Score 8–10: Interm. I',
    accent: false,
  },
  {
    num: '02',
    tag: 'Task 1 · 20 Min',
    title: 'Seek-Locked Lecture',
    body: 'Curated masterclasses with fast-forwarding disabled. Download academic PDF guides to annotate syntactic structures. 100% watch gate.',
    footLeft: 'Status: 100% Watch Gate',
    footRight: 'Verified',
    accent: false,
  },
  {
    num: '03',
    tag: 'Task 2 · 15 Min',
    title: 'Dual-Track Listening',
    body: 'Choose between Informative Academic Discourse or Conversational Entertainment to sharpen dialectical comprehension.',
    footLeft: 'Amharic context notes',
    footRight: 'Dual Subtitles',
    accent: false,
  },
  {
    num: '04',
    tag: 'Escrow Gate',
    title: '20-Question Daily Exam',
    body: 'Achieve ≥75% to defend your stake. Failing deducts ETB 25; an unsubmitted day incurs an automatic ETB 80 forfeit.',
    footLeft: 'Penalty: ETB 25 Fail',
    footRight: 'ETB 80 Absent',
    accent: true,
  },
];

const TIERS = [
  { level: 'Level I', name: 'Beginner I', desc: 'Phonetics, basic syntax & survival conversational frames.', days: '30 DAYS · 30 EXAMS', entry: true },
  { level: 'Level II', name: 'Beginner II', desc: 'Compound tenses, workplace correspondence & listening fluency.', days: '30 DAYS · 30 EXAMS', entry: false },
  { level: 'Level III', name: 'Intermediate I', desc: 'Complex conditional reasoning, formal negotiation & debate.', days: '30 DAYS · 30 EXAMS', entry: false },
  { level: 'Level IV', name: 'Intermediate II', desc: 'Idiomatic depth, cross-cultural diplomacy & thesis framing.', days: '30 DAYS · 30 EXAMS', entry: false },
  { level: 'Level V', name: 'Advanced I', desc: 'IELTS/TOEFL mastery, academic research papers & oration.', days: '30 DAYS · 30 EXAMS', entry: false },
  { level: 'Level VI', name: 'Advanced II', desc: 'Spontaneous executive delivery & diaspora discourse leadership.', days: '30 DAYS · 30 EXAMS', entry: false },
];

const STATS = [
  { value: <AnimatedCounter from={0} to={6} />, suffix: '', label: 'Level Tiers' },
  { value: <AnimatedCounter from={0} to={180} />, suffix: '', label: 'Days to Fluency' },
  { value: <AnimatedCounter from={0} to={1000} prefix="ETB " />, suffix: '', label: 'Stake Locked', primary: true },
  { value: '≥75', suffix: '%', label: 'Exam Pass Gate', tertiary: true },
];

const LandingPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, role } = useRole();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [rawVideoUrl, setRawVideoUrl] = useState(EXPLAINER_YOUTUBE_VIDEO_ID);
  const explainerRef = useRef(null);

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

  const scrollToExplainer = () => {
    explainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative overflow-hidden transition-colors duration-300">
      {/* ================================================================ */}
      {/* HERO MASTHEAD                                                     */}
      {/* ================================================================ */}
      <section className="relative w-full py-16 md:py-24 lg:py-28 px-6 lg:px-12 border-b border-hairline/50">
        {/* Ambient illumination */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[520px] bg-gradient-to-b from-primary/8 via-tertiary-fixed/6 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div variants={heroContainer} initial="hidden" animate="visible" className="flex flex-col items-center w-full">
            {/* Delicate Sub-eyebrow */}
            <motion.div
              variants={heroItem}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-container/70 border border-hairline/70 text-on-surface-variant font-mono text-[10px] tracking-[0.24em] uppercase mb-8"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>{t('hero.badge', 'Financial Accountability & Habit Contract Engine')}</span>
            </motion.div>

            {/* Calligraphic High-Contrast Masthead */}
            <motion.h1
              variants={heroItem}
              className="font-cormorant text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-normal leading-[1.05] tracking-tight text-on-surface mb-8 max-w-4xl"
            >
              {t('hero.title', 'Master English Through ')}
              <span className="calligraphic-italic text-primary">Real Financial</span>
              {t('hero.titleCommitment', ' Commitment.')}
            </motion.h1>

            {/* Editorial Paragraph */}
            <motion.p
              variants={heroItem}
              className="font-sans text-base md:text-lg text-on-surface-variant max-w-2xl font-light leading-relaxed mb-10"
            >
              {t('hero.description', 'Daily academic rigor backed by high-stakes escrow. Advance from Beginner I to Advanced II across six 30-day cohorts. Complete three compulsory tasks daily or forfeit your staked deposit to the cohort yield pool.')}
            </motion.p>

            {/* Distinct Buttons */}
            <motion.div variants={heroItem} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                to={targetAuthRoute}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-on-primary font-sans text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2.5 group focus-ring btn-interactive"
              >
                <span>{isAuthenticated ? t('common.goToDashboard', 'Go to Dashboard') : t('hero.ctaPrimary', 'Start Placement Assessment')}</span>
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <button
                onClick={scrollToExplainer}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-surface-container-high/60 text-on-surface font-sans text-xs tracking-wider uppercase font-medium hover:bg-surface-container transition-all duration-200 flex items-center justify-center gap-2 border border-hairline/60 focus-ring cursor-pointer"
              >
                <Play size={16} className="text-primary" />
                <span>{t('hero.ctaSecondary', 'Protocol Explainer')}</span>
              </button>
            </motion.div>

            {/* Minimalist Stats Strip */}
            <motion.div
              variants={heroItem}
              className="w-full max-w-4xl mt-16 md:mt-24 pt-10 border-t border-hairline/50 grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <span className={`font-cormorant text-4xl lg:text-5xl font-normal ${stat.primary ? 'text-primary' : stat.tertiary ? 'text-tertiary' : 'text-on-surface'}`}>
                    {stat.value}
                    {stat.suffix && <span className={`font-cormorant ${stat.tertiary ? 'text-tertiary' : 'text-text-muted'} font-light text-2xl align-top`}>{stat.suffix}</span>}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.18em] text-on-surface-variant uppercase mt-1">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PROTOCOL EXPLAINER — REAL VIDEO SHOWCASE                         */}
      {/* ================================================================ */}
      <section ref={explainerRef} className="scroll-mt-28 py-20 lg:py-24 px-6 lg:px-12 w-full max-w-7xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col gap-10"
        >
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <motion.span variants={cardVariants} className="inline-flex items-center gap-2 px-3.5 py-1 bg-surface-container/70 border border-hairline/70 text-primary font-mono text-[10px] tracking-[0.22em] rounded-full uppercase">
              <Sparkles size={13} className="text-tertiary" />
              <span>{t('videoShowcase.badge', 'PROTOCOL EXPLAINER')}</span>
            </motion.span>
            <motion.h2 variants={cardVariants} className="font-cormorant text-3xl md:text-5xl text-on-surface font-normal tracking-tight">
              {t('videoShowcase.title', 'See how the ')}
              <span className="calligraphic-italic text-primary">{t('videoShowcase.titleAccent', 'Academic Escrow')}</span>
              {t('videoShowcase.titleEnd', ' Protocol works')}
            </motion.h2>
            <motion.p variants={cardVariants} className="text-on-surface-variant text-sm sm:text-base leading-relaxed font-light">
              {t('videoShowcase.description', 'Watch how our daily 3-task curriculum and financial escrow vault keep you accountable, build unbreakable habits, and help you master English.')}
            </motion.p>
          </div>

          {/* 16:9 Video Frame */}
          <motion.div
            variants={cardVariants}
            className="relative w-full aspect-video bg-[#1a1413] rounded-2xl overflow-hidden shadow-xl border border-stone-800/60"
          >
            {isVideoPlaying ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
                title="Ethio-Lingo Protocol Explainer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            ) : (
              <div
                onClick={() => setIsVideoPlaying(true)}
                className="absolute inset-0 cursor-pointer group flex flex-col justify-between p-6"
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt="Ethio-Lingo Protocol Explainer Video"
                  onError={(e) => {
                    e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.45] group-hover:brightness-[0.55] transition duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1413] via-transparent to-[#1a1413]/30" />

                {/* Archive header */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="font-mono text-[9px] bg-stone-900/80 backdrop-blur-sm px-2.5 py-1 rounded tracking-wider text-stone-300">
                    ETHIO-LINGO ARCHIVE
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-primary/85 text-on-primary px-3 py-1 rounded-full text-[11px] font-mono tracking-wide">
                    <Lock size={12} />
                    <span>{t('videoShowcase.duration', 'PROTOCOL WALKTHROUGH')}</span>
                  </span>
                </div>

                {/* Center play */}
                <div className="relative z-10 flex flex-col items-center gap-4 my-auto">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/40 rounded-full animate-ping opacity-60" />
                    <div className="relative w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Play size={28} className="ml-1" />
                    </div>
                  </div>
                  <span className="font-cormorant text-2xl md:text-3xl text-stone-100">
                    {t('videoShowcase.caption', 'Complete Walkthrough: Staking, Daily Practice & Withdrawal')}
                  </span>
                </div>

                {/* Bottom mono note */}
                <div className="relative z-10 flex items-center justify-between font-mono text-[11px] text-stone-400">
                  <span>{t('videoShowcase.clickToWatch', 'CLICK TO WATCH')}</span>
                  <span>YOUTUBE · 1080P · SEEKING ENABLED</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* 3 Key Takeaways */}
          <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 bg-surface-container-lowest rounded-2xl border border-hairline/60 shadow-sm flex items-start gap-4 hover:border-primary/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Lock size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="font-cormorant text-xl text-on-surface font-medium">{t('videoShowcase.takeaway1Title', '1. Lock Escrow Stake')}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                  {t('videoShowcase.takeaway1Desc', 'Deposit 1,000 ETB once into your secure vault to activate 30 days of daily learning.')}
                </p>
              </div>
            </div>
            <div className="p-6 bg-surface-container-lowest rounded-2xl border border-hairline/60 shadow-sm flex items-start gap-4 hover:border-primary/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Flame size={18} className="text-tertiary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-cormorant text-xl text-on-surface font-medium">{t('videoShowcase.takeaway2Title', '2. Complete Your Daily Tasks')}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                  {t('videoShowcase.takeaway2Desc', 'Lesson video, listening practice, and a daily exam. Advance your streak and build lasting study habits.')}
                </p>
              </div>
            </div>
            <div className="p-6 bg-surface-container-lowest rounded-2xl border border-hairline/60 shadow-sm flex items-start gap-4 hover:border-primary/40 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="font-cormorant text-xl text-on-surface font-medium">{t('videoShowcase.takeaway3Title', '3. Protect & Withdraw')}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                  {t('videoShowcase.takeaway3Desc', 'Pass your daily modules to protect 100% of your stake and withdraw directly to your account.')}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================ */}
      {/* METHODOLOGICAL RIGOR — EDITORIAL 4-STEP SEQUENCE                 */}
      {/* ================================================================ */}
      <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 pb-20 lg:pb-24 flex flex-col gap-12">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col gap-12"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline/40">
            <div>
              <motion.div variants={cardVariants} className="inline-flex items-center gap-2 mb-2 font-mono text-[10px] tracking-[0.25em] text-primary uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{t('method.sectionBadge', 'Methodology')}</span>
              </motion.div>
              <motion.h2 variants={cardVariants} className="font-cormorant text-3xl md:text-5xl text-on-surface font-normal">
                {t('method.title', 'The Daily ')}
                <span className="calligraphic-italic text-primary">{t('method.titleAccent', 'Academic Escrow')}</span>
                {t('method.titleEnd', ' Protocol')}
              </motion.h2>
            </div>
            <motion.p variants={cardVariants} className="font-sans text-sm md:text-base text-on-surface-variant max-w-md leading-relaxed font-light">
              {t('method.description', 'Structured precision designed for Ethiopian scholars, diaspora professionals, and civil servants preparing for global fluency.')}
            </motion.p>
          </div>

          {/* 4 Airy Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {METHOD_STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                variants={cardVariants}
                custom={idx}
                transition={{ duration: 0.6, ease: easeEditorial, delay: idx * 0.06 }}
                className={
                  step.accent
                    ? 'bg-surface-container-lowest p-8 rounded-2xl border-2 border-primary/50 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group'
                    : 'bg-surface-container-lowest/80 p-8 rounded-2xl border border-hairline/50 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg hover:shadow-stone-900/5 hover:-translate-y-1 transition-all duration-300 group'
                }
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className={`font-cormorant text-3xl transition-colors ${step.accent ? 'text-primary font-medium' : 'text-stone-300 group-hover:text-primary'}`}>
                      {step.num}
                    </span>
                    <span
                      className={
                        step.accent
                          ? 'font-mono text-[9px] bg-primary text-on-primary px-2 py-0.5 rounded tracking-wider uppercase font-semibold'
                          : 'font-mono text-[9px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded tracking-wider uppercase'
                      }
                    >
                      {step.tag}
                    </span>
                  </div>
                  <h3 className="font-cormorant text-2xl text-on-surface font-medium mb-2">{step.title}</h3>
                  <p className="font-sans text-xs leading-relaxed text-on-surface-variant">{step.body}</p>
                </div>
                <div className={`mt-8 pt-4 border-t flex items-center justify-between font-mono text-[10px] ${step.accent ? 'border-primary/15 text-error font-medium' : 'border-hairline/40 text-text-muted'}`}>
                  <span>{step.footLeft}</span>
                  <span className={step.accent ? '' : 'text-primary font-semibold'}>{step.footRight}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ================================================================ */}
      {/* PROGRESSION ARCHITECTURE — DARK RICH SECTION                     */}
      {/* ================================================================ */}
      <section className="w-full bg-surface-dark text-[#fbf9f5] py-20 lg:py-24 px-6 lg:px-12">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-7xl mx-auto flex flex-col gap-12"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-800">
            <div>
              <motion.span variants={cardVariants} className="font-mono text-[10px] text-primary-fixed-dim uppercase tracking-[0.25em]">
                {t('levels.sectionBadge', 'Progression Architecture')}
              </motion.span>
              <motion.h2 variants={cardVariants} className="font-cormorant text-3xl md:text-5xl text-[#faf9f5] font-normal mt-1">
                {t('levels.title', 'Six 30-Day ')}
                <span className="calligraphic-italic text-primary-fixed-dim">{t('levels.titleAccent', 'Cohort Tiers')}</span>
              </motion.h2>
            </div>
            <motion.span variants={cardVariants} className="font-mono text-xs text-stone-400">
              {t('levels.totalNote', 'Total: 180 Days to Native Fluency')}
            </motion.span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TIERS.map((tier, idx) => (
              <motion.div
                key={tier.name}
                variants={cardVariants}
                transition={{ duration: 0.55, ease: easeEditorial, delay: idx * 0.05 }}
                className={
                  tier.entry
                    ? 'bg-primary-container/90 border border-primary-fixed/40 p-6 rounded-xl flex flex-col justify-between shadow-2xl relative'
                    : 'bg-stone-900/60 border border-stone-800/80 p-6 rounded-xl flex flex-col justify-between hover:border-stone-700 transition-colors'
                }
              >
                <span className={`font-mono text-[9px] uppercase tracking-widest ${tier.entry ? 'text-primary-fixed font-semibold' : 'text-stone-400'}`}>
                  {tier.entry ? t('levels.entry', 'Placement Entry') : tier.level}
                </span>
                <div>
                  <h4 className={`font-cormorant text-xl font-medium mt-1 ${tier.entry ? 'text-on-primary' : 'text-stone-100'}`}>
                    {tier.name}
                  </h4>
                  <p className={`font-sans text-xs mt-3 font-light leading-relaxed ${tier.entry ? 'text-on-primary/90' : 'text-stone-400'}`}>
                    {tier.desc}
                  </p>
                </div>
                <span className={`font-mono text-[10px] mt-6 pt-3 border-t font-medium ${tier.entry ? 'text-primary-fixed border-primary-fixed/20' : 'text-stone-500 border-stone-800'}`}>
                  {tier.days}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ================================================================ */}
      {/* QUIET PILLARS                                                      */}
      {/* ================================================================ */}
      <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col md:flex-row items-start justify-between gap-12"
        >
          <motion.div variants={cardVariants} className="flex items-start gap-5 max-w-md">
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Banknote size={22} />
            </div>
            <div>
              <h4 className="font-cormorant text-2xl text-on-surface font-medium">{t('pillars.settlementTitle', 'CBE & Telebirr Automated Settlement')}</h4>
              <p className="font-sans text-xs text-on-surface-variant mt-2 leading-relaxed font-light">
                {t('pillars.settlementDesc', 'Every deposit is tracked in verified ledger tiers. Yields disperse immediately after 30-day cohort graduation.')}
              </p>
            </div>
          </motion.div>
          <motion.div variants={cardVariants} className="flex items-start gap-5 max-w-md">
            <div className="w-11 h-11 rounded-full bg-tertiary-container/15 border border-tertiary-container/25 flex items-center justify-center text-tertiary shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <h4 className="font-cormorant text-2xl text-on-surface font-medium">{t('pillars.amharicTitle', 'Linguistically Calibrated for Amharic Speakers')}</h4>
              <p className="font-sans text-xs text-on-surface-variant mt-2 leading-relaxed font-light">
                {t('pillars.amharicDesc', 'Targets common Ge\u2019ez syntax interference, verb conjugation drift, and accent nuances.')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================ */}
      {/* ESCROW STAKING & SLASHING MECHANICS                               */}
      {/* ================================================================ */}
      <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 pb-20 lg:pb-24 flex flex-col gap-12">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col gap-12"
        >
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <motion.span variants={cardVariants} className="inline-flex items-center gap-2 px-3.5 py-1 bg-surface-container/70 border border-hairline/70 text-primary font-mono text-[10px] tracking-[0.22em] rounded-full uppercase">
              <ShieldAlert size={12} className="text-tertiary" />
              <span>{t('staking.sectionBadge', 'Financial Escrow Engine')}</span>
            </motion.span>
            <motion.h2 variants={cardVariants} className="font-cormorant text-3xl md:text-5xl text-on-surface font-normal">
              {t('staking.title', 'How ')}
              <span className="calligraphic-italic text-primary">{t('staking.titleAccent', 'Staking & Protection')}</span>
              {t('staking.titleEnd', ' Work')}
            </motion.h2>
            <motion.p variants={cardVariants} className="text-on-surface-variant text-sm sm:text-base leading-relaxed font-light">
              {t('staking.description', 'Money locked in escrow enforces daily habit building. Pass daily tasks and exams to protect 100% of your staked capital.')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={cardVariants} className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <Lock size={18} />
              </div>
              <h3 className="font-cormorant text-2xl text-on-surface font-medium">{t('staking.depositTitle', '1,000 ETB Initial Deposit')}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                {t('staking.depositDesc', 'Deposit 1,000 ETB via Telebirr or Ethiopian Bank Transfer. With a 0% platform fee, your full 1,000 ETB is locked in your escrow vault.')}
              </p>
              <span className="font-mono text-[9px] text-primary font-bold uppercase tracking-widest block pt-3 border-t border-hairline/40">
                0% PLATFORM FEE
              </span>
            </motion.div>

            <motion.div variants={cardVariants} className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3 hover:border-error/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-error/10 border border-error/20 text-error flex items-center justify-center">
                <ShieldAlert size={18} />
              </div>
              <h3 className="font-cormorant text-2xl text-on-surface font-medium">{t('staking.penaltyTitle', 'Slashing Penalty Mechanics')}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                {t('staking.penaltyDesc', 'Failing an exam attempt slashes 25 ETB. Missing a 24-hour day window slashes 80 ETB, resets streak to 0, and forces module repeat.')}
              </p>
              <span className="font-mono text-[9px] text-error font-bold uppercase tracking-widest block pt-3 border-t border-hairline/40">
                -ETB 25 FAIL · -ETB 80 ABSENT
              </span>
            </motion.div>

            <motion.div variants={cardVariants} className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3 hover:border-success-green/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-success-green/10 border border-success-green/25 text-success-green flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <h3 className="font-cormorant text-2xl text-on-surface font-medium">{t('staking.withdrawalTitle', 'Withdrawal at Level End')}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed font-light">
                {t('staking.withdrawalDesc', 'Upon completing a 30-day level, submit bank / Telebirr details to request manual withdrawal approval, or continue to the next level if stake > 100 ETB.')}
              </p>
              <span className="font-mono text-[9px] text-success-green font-bold uppercase tracking-widest block pt-3 border-t border-hairline/40">
                MANUAL ADMIN VERIFICATION
              </span>
            </motion.div>
          </div>

          {/* Free Trial Option Card */}
          <motion.div
            variants={cardVariants}
            className="p-6 bg-surface-container-lowest border border-hairline/60 rounded-3xl flex flex-wrap items-center justify-between gap-6 max-w-4xl mx-auto shadow-sm hover:border-primary/40 transition-all duration-300"
          >
            <div className="space-y-1.5">
              <span className="inline-flex px-3 py-1 bg-primary text-on-primary font-mono text-[9px] tracking-[0.18em] font-bold rounded-full uppercase">
                {t('staking.trialBadge', '3-Day Free Trial')}
              </span>
              <h4 className="font-cormorant text-2xl text-on-surface font-medium">
                {t('staking.trialTitle', 'Want to try Ethio-Lingo before staking money?')}
              </h4>
              <p className="text-xs text-on-surface-variant font-light">
                {t('staking.trialDesc', 'Try 3 free preview modules without financial stake or streak penalties. Upgrade anytime to the paid tier!')}
              </p>
            </div>
            <Link
              to={targetAuthRoute}
              className="px-6 py-3 rounded-full bg-surface-dark text-white font-sans text-xs tracking-wider uppercase font-medium hover:bg-stone-800 transition-all shadow-sm shrink-0 focus-ring btn-interactive inline-flex items-center gap-1.5"
            >
              <span>{isAuthenticated ? t('common.goToDashboard', 'Go to Dashboard') : t('common.startFreeTrial', 'Start 3-Day Free Trial')}</span>
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================ */}
      {/* INTERACTIVE PLATFORM JOURNEY — GSAP HORIZONTAL FLOW               */}
      {/* ================================================================ */}
      <HorizontalScrollGallery />

      {/* ================================================================ */}
      {/* FINAL CALL TO ACTION                                              */}
      {/* ================================================================ */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: easeEditorial }}
          className="bg-surface-dark text-[#fbf9f5] rounded-3xl p-10 sm:p-14 shadow-2xl space-y-6 border border-stone-800 relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-tertiary/15 rounded-full blur-3xl pointer-events-none" />

          <h2 className="font-cormorant text-4xl sm:text-6xl text-white font-normal tracking-tight relative z-10">
            {t('cta.title', 'Ready to Build ')}
            <span className="calligraphic-italic text-primary-fixed-dim">{t('cta.titleAccent', 'Daily Study Discipline')}</span>
            {t('cta.titleEnd', '?')}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-light relative z-10">
            {t('cta.description', 'Join Ethio-Lingo, take the 10-question placement test, choose your stake or free trial, and master English step-by-step.')}
          </p>
          <div className="pt-4 flex justify-center relative z-10">
            <Link
              to={targetAuthRoute}
              className="px-9 py-4 rounded-full bg-primary text-on-primary font-sans text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-2.5 focus-ring btn-interactive group"
            >
              <span>{isAuthenticated ? t('common.goToDashboard', 'Go to Dashboard') : t('common.getStarted', 'Get Started Now')}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;