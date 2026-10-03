import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { useSiteContent } from '../../context/SiteContentContext';

const CountdownWidget = () => {
  const { dailyTasks, currentModuleDay, currentLevel, advanceToNextDay } = useStaking();
  const { c } = useSiteContent();
  const safeDailyTasks = dailyTasks || { lesson: false, video: false, exam: false };
  const allTasksDone =
    safeDailyTasks.lesson &&
    safeDailyTasks.video &&
    safeDailyTasks.exam;

  const currentIdx = CURRICULUM_LEVELS.indexOf(currentLevel);
  const nextLevel = (currentIdx !== -1 && currentIdx < CURRICULUM_LEVELS.length - 1)
    ? CURRICULUM_LEVELS[currentIdx + 1]
    : null;

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // The midnight rollover must advance the day exactly once. The advance used
  // to run inside the 1-second tick, so every tick past midnight pushed the
  // learner another day forward — a night tab left open skipped several modules
  // at once. Latching on the calendar date also stops a re-render (or React
  // StrictMode's double-invoke) from firing it twice for the same night.
  const advancedForDateRef = useRef(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);

      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    const tryAdvanceIfComplete = () => {
      if (!allTasksDone) return;
      const todayKey = new Date().toDateString();
      if (advancedForDateRef.current === todayKey) return;
      advancedForDateRef.current = todayKey;
      advanceToNextDay();
    };

    setTimeLeft(calculateTimeRemaining());

    // Check the rollover straight away too: a tab opened after midnight has
    // already gone past zero and would otherwise wait a full second, and more
    // importantly would never catch a date change while it sits in the
    // background (browsers throttle timers in hidden tabs).
    tryAdvanceIfComplete();

    const onVisibility = () => {
      if (document.hidden) return;
      setTimeLeft(calculateTimeRemaining());
      tryAdvanceIfComplete();
    };

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
      tryAdvanceIfComplete();
    }, 1000);

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [allTasksDone, advanceToNextDay]);

  const formatDigit = (num) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div className="bg-surface-container-low rounded-xl border border-hairline/40 p-5 sm:p-6 flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="font-mono text-[10px] tracking-widest text-primary uppercase font-semibold">
          {c('nav.countdownLabel')}
        </span>
        <span className="font-mono text-[10px] text-text-muted">{c('nav.countdownTz')}</span>
      </div>

      {/* Status Header */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] font-bold rounded-full uppercase tracking-wider border ${
            allTasksDone
              ? 'bg-success-green/10 text-success-green border-success-green/30'
              : 'bg-warning-amber/10 text-warning-amber border-warning-amber/30'
          }`}
        >
          {allTasksDone ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          <span>
            {allTasksDone
              ? (currentModuleDay === 30 ? c('nav.countdownLevelComplete', { level: currentLevel }) : c('nav.countdownDayComplete', { day: currentModuleDay }))
              : c('nav.countdownIncomplete', { day: currentModuleDay })}
          </span>
        </span>
        <h3 className="font-cormorant text-lg sm:text-xl text-on-surface font-normal tracking-tight">
          {allTasksDone
            ? (currentModuleDay === 30
                ? c('nav.countdownLevelDone', { level: currentLevel })
                : c('nav.countdownDayDone', { day: currentModuleDay }))
            : c('nav.countdownHeader')}
        </h3>
      </div>

      {/* Real-time Digital Timer Clock */}
      <div className="flex items-center gap-3 sm:gap-4 text-on-surface flex-wrap">
        <Clock
          size={18}
          className={`shrink-0 ${allTasksDone ? 'text-success-green' : 'text-tertiary animate-pulse'}`}
        />

        <div className="bg-surface px-4 py-3 rounded-lg border border-hairline/40 text-center min-w-[70px]">
          <span className="font-cormorant text-3xl font-medium tabular-nums block leading-none">
            {formatDigit(timeLeft.hours)}
          </span>
          <span className="block font-mono text-[9px] text-text-muted mt-1.5 tracking-wider">HRS</span>
        </div>

        <span className="text-text-muted font-mono text-xl leading-none">:</span>

        <div className="bg-surface px-4 py-3 rounded-lg border border-hairline/40 text-center min-w-[70px]">
          <span className="font-cormorant text-3xl font-medium tabular-nums block leading-none">
            {formatDigit(timeLeft.minutes)}
          </span>
          <span className="block font-mono text-[9px] text-text-muted mt-1.5 tracking-wider">MIN</span>
        </div>

        <span className="text-text-muted font-mono text-xl leading-none">:</span>

        <div className="bg-surface px-4 py-3 rounded-lg border border-hairline/40 text-center min-w-[70px]">
          <span
            className={`font-cormorant text-3xl font-medium tabular-nums block leading-none ${
              allTasksDone ? 'text-success-green' : 'text-tertiary'
            }`}
          >
            {formatDigit(timeLeft.seconds)}
          </span>
          <span className="block font-mono text-[9px] text-text-muted mt-1.5 tracking-wider">SEC</span>
        </div>

        {allTasksDone && (
          <div className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 bg-primary/10 border border-primary/25 text-primary font-mono text-xs rounded-full shadow-xs">
            <Lock size={13} />
            <span>
              {currentModuleDay === 30
                ? c('nav.countdownTransition', { nextLevel: nextLevel || 'Next Level' })
                : c('nav.countdownNextDay', { nextDay: currentModuleDay + 1 })}
            </span>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <p className="border-t border-hairline/40 pt-3 font-sans text-xs text-on-surface-variant font-light leading-relaxed">
        {allTasksDone
          ? (currentModuleDay === 30
              ? c('nav.countdownTransitionNote', { nextLevel: nextLevel || 'Next Level' })
              : c('nav.countdownFooterDone', { nextDay: currentModuleDay + 1 }))
          : c('nav.countdownFooterLocked')}
      </p>
    </div>
  );
};

export default CountdownWidget;