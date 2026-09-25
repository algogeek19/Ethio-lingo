import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Video,
  Play,
  BookOpen,
  Award,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const GALLERY_CARDS = [
  {
    step: "01",
    title: "10-Question Placement Quiz",
    subtitle: "ONBOARDING & LEVEL SELECTION",
    description:
      "Answer 10 diagnostic English grammar questions during account setup to evaluate your proficiency and get enrolled directly into Beginner I (0–7 score) or Intermediate I (8–10 score).",
    badge: "DIAGNOSTIC TEST",
    badgeColor: "bg-primary-coral text-white",
    icon: Award,
    stats: "Score 0-7 → Beginner I | 8-10 → Intermediate I",
  },
  {
    step: "02",
    title: "Task 1: Daily Lesson Video",
    subtitle: "MANDATORY WORKSPACE TASK 1",
    description:
      "Watch your daily module educational lecture. Seeking is strictly locked; video must be watched for 100% duration to complete. Includes downloadable PDF companion guide.",
    badge: "SEEK-LOCKED • 100% DURATION",
    badgeColor: "bg-surface-dark text-warning-amber border border-stone-800",
    icon: Video,
    stats: "Auto-pauses when tab is inactive",
  },
  {
    step: "03",
    title: "Task 2: Listening Practice",
    subtitle: "MANDATORY WORKSPACE TASK 2",
    description:
      "Improve active listening comprehension with YouTube content based on your choice: Informative Academic English or Educational Entertainment.",
    badge: "INFORMATIVE OR ENTERTAINMENT",
    badgeColor: "bg-primary-coral text-white",
    icon: Play,
    stats: "Seeking locked • 100% watch required",
  },
  {
    step: "04",
    title: "Scholar-to-Scholar Messenger",
    subtitle: "ONE-ON-ONE CHAT WITH LEARNERS AT YOUR LEVEL",
    description:
      "Open the messenger and pick a scholar at your level for a direct one-on-one conversation — no chatrooms, no group feeds. Every message has a report button so issues reach the admin immediately.",
    badge: "PEER-TO-PEER DIRECT CHAT",
    badgeColor: "bg-primary-coral text-white",
    icon: MessageCircle,
    stats: "Back button returns to peer picker",
  },
  {
    step: "05",
    title: "20-Question Daily Exam",
    subtitle: "MANDATORY DAILY EXAM",
    description:
      "Unlocks after Task 1 and Task 2 are finished. Complete 20 multiple-choice questions. Passing score is 15/20 (75%) to advance streak and protect your money. Review every wrong answer afterwards.",
    badge: "PASS ≥ 15/20 (75%)",
    badgeColor: "bg-streak-orange text-white",
    icon: BookOpen,
    stats: "Fail: -25 ETB penalty | Miss 24h: -80 ETB",
  },
  {
    step: "06",
    title: "Escrow Vault & Level Withdrawal",
    subtitle: "30-DAY LEVEL SETTLEMENT",
    description:
      "Initial 1,000 ETB deposit with a 0% fee locks the full 1,000 ETB net stake. After completing all 30 days of a level, submit bank / Telebirr details to request full withdrawal.",
    badge: "1,000 ETB DEPOSIT • 0% FEE",
    badgeColor: "bg-surface-dark text-success-green border border-stone-800",
    icon: ShieldCheck,
    stats: "Manual Admin Verification & Payout",
  },
];

const HorizontalScrollGallery = () => {
  const triggerRef = useRef(null);
  const trackRef = useRef(null);

  useLayoutEffect(() => {
    let ctx;
    // Safety delay to ensure React DOM rendering & element dimension calculations are 100% complete
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        const track = trackRef.current;
        const trigger = triggerRef.current;
        if (!track || !trigger) return;

        // Calculate exact horizontal scroll width
        const totalTrackWidth = track.scrollWidth;
        const viewportWidth = window.innerWidth;
        const scrollDistance = totalTrackWidth - viewportWidth + 80;

        gsap.to(track, {
          x: () => -scrollDistance,
          ease: "none",
          scrollTrigger: {
            trigger: trigger,
            pin: true,
            scrub: 1,
            start: "top top",
            end: () => `+=${scrollDistance + 200}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      }, triggerRef);

      ScrollTrigger.refresh();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative overflow-hidden bg-surface-dark text-white py-16 border-y border-stone-800 transition-colors duration-300"
    >
      {/* Sticky Header Banner */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-primary-fixed-dim uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim animate-pulse" />
            <span>INTERACTIVE PLATFORM JOURNEY</span>
          </div>
          <h2 className="font-cormorant text-3xl sm:text-5xl text-white font-normal mt-2">
            The Complete <span className="calligraphic-italic text-primary-fixed-dim">Learning & Staking</span> Flow
          </h2>
        </div>
        <span className="font-mono text-[10px] text-stone-500 uppercase tracking-[0.2em]">
          Scroll ↓
        </span>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="w-full overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-6 px-6 lg:px-12 w-max items-center py-4"
        >
          {GALLERY_CARDS.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.step}
                className="w-[340px] sm:w-[420px] bg-stone-900/60 border border-stone-800/80 hover:border-primary-fixed/40 rounded-xl p-7 flex flex-col justify-between h-[420px] shadow-2xl transition-colors group shrink-0 relative overflow-hidden focus-ring"
              >
                {/* Background Step Watermark */}
                <div className="absolute -right-4 -bottom-6 text-8xl font-cormorant text-stone-800/40 select-none pointer-events-none">
                  {card.step}
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-primary/15 border border-primary-fixed/25 text-primary-fixed-dim flex items-center justify-center font-mono font-bold text-sm">
                      {card.step}
                    </span>
                    <span className="font-mono text-[9px] text-stone-400 uppercase tracking-[0.18em]">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-primary-fixed-dim uppercase tracking-wider font-semibold">
                      {card.subtitle}
                    </span>
                    <h3 className="font-cormorant text-2xl text-white mt-1 flex items-center gap-2">
                      <IconComponent
                        size={19}
                        className="text-primary-fixed-dim shrink-0"
                      />
                      <span>{card.title}</span>
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-light">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800/80 relative z-10 flex items-center justify-between font-mono text-[10px] text-stone-500">
                  <span>{card.stats}</span>
                  <ShieldCheck size={15} className="text-primary-fixed-dim" />
                </div>
              </div>
            );
          })}

          {/* Final Call To Action Card inside Horizontal Scroll */}
          <div className="w-[320px] sm:w-[360px] bg-primary text-on-primary rounded-2xl p-8 flex flex-col justify-between h-[420px] shadow-2xl shrink-0 text-center relative overflow-hidden">
            <span className="absolute -top-10 -right-10 w-40 h-40 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />
            <div className="my-auto space-y-4 relative z-10">
              <div className="w-14 h-14 bg-primary-fixed/15 rounded-full flex items-center justify-center mx-auto">
                <Award size={30} />
              </div>
              <h3 className="font-cormorant text-3xl text-on-primary font-medium">
                Start Your 30-Day Cycle
              </h3>
              <p className="text-xs text-on-primary/90 leading-relaxed font-light">
                Build daily study discipline, pass exams, and protect your stake
                balance.
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-on-primary text-primary font-sans text-xs tracking-wider uppercase font-semibold rounded-full hover:bg-primary-fixed transition-colors shadow-md w-full focus-ring btn-interactive"
              >
                <span>Take Placement Quiz</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorizontalScrollGallery;
