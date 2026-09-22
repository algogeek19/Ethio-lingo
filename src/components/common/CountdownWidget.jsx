import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';

const CountdownWidget = () => {
  const { dailyTasks, currentModuleDay, currentLevel, advanceToNextDay } = useStaking();
  const safeDailyTasks = dailyTasks || { lesson: false, video: false, pdf: false, exam: false };
  const allTasksDone =
    safeDailyTasks.lesson &&
    safeDailyTasks.video &&
    safeDailyTasks.pdf &&
    safeDailyTasks.exam;

  const currentIdx = CURRICULUM_LEVELS.indexOf(currentLevel);
  const nextLevel = (currentIdx !== -1 && currentIdx < CURRICULUM_LEVELS.length - 1)
    ? CURRICULUM_LEVELS[currentIdx + 1]
    : null;

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);

      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        // Countdown reached 0 (midnight)
        if (allTasksDone) {
          advanceToNextDay();
        }
        return { hours: 0, minutes: 0, seconds: 0 };
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeRemaining());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [allTasksDone, advanceToNextDay]);

  const formatDigit = (num) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-md ${
        allTasksDone
          ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
          : 'bg-surface-dark text-white border-stone-800'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Header */}
        <div className="space-y-1.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1 ${
                allTasksDone
                  ? 'bg-emerald-800 text-emerald-200'
                  : 'bg-amber-900/80 text-amber-200 border border-amber-700/50'
              }`}
            >
              {allTasksDone ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              <span>
                {allTasksDone
                  ? (currentModuleDay === 30 ? `LEVEL ${currentLevel} COMPLETED` : `DAY ${currentModuleDay} COMPLETED`)
                  : `DAY ${currentModuleDay} TASKS INCOMPLETE`}
              </span>
            </span>
          </div>

          <h3 className="font-serif font-bold text-base sm:text-lg tracking-tight text-white">
            {allTasksDone
              ? (currentModuleDay === 30
                  ? `Level ${currentLevel} Mastered! 30/30 Days Complete.`
                  : `Day ${currentModuleDay} Mastered! Stake Safe & Streak Secured.`)
              : `Streak & Escrow Expiration Countdown:`}
          </h3>
          <p className="text-xs text-stone-300 font-mono">
            {allTasksDone
              ? (currentModuleDay === 30
                  ? (nextLevel ? `Transitioning to Day 1 of ${nextLevel} when countdown reaches zero.` : `All 6 Curriculum Levels Completed!`)
                  : `All 4 daily tasks completed! Day ${currentModuleDay + 1} unlocks when the midnight countdown reaches zero.`)
              : 'Complete all 4 daily workspace tasks before midnight to protect your stake.'}
          </p>

          {allTasksDone && (
            <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 font-mono text-xs rounded-xl shadow-xs">
              <Lock size={13} />
              <span>
                {currentModuleDay === 30
                  ? (nextLevel ? `Transitioning to ${nextLevel} (Day 1) at Midnight` : `Curriculum Fully Mastered`)
                  : `Day ${currentModuleDay + 1} Unlocks at Midnight Countdown`}
              </span>
            </div>
          )}
        </div>

        {/* Real-time Digital Timer Clock */}
        <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10 shadow-inner">
          <Clock
            size={22}
            className={allTasksDone ? 'text-emerald-400' : 'text-warning-amber animate-pulse'}
          />

          <div className="flex items-center gap-1.5 font-mono">
            <div className="text-center">
              <span className="px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-lg sm:text-xl font-bold block text-white shadow-sm">
                {formatDigit(timeLeft.hours)}
              </span>
              <span className="text-[9px] text-stone-400 uppercase font-semibold mt-0.5 block">HRS</span>
            </div>

            <span className="text-xl font-bold text-stone-400 font-serif leading-none mb-3">:</span>

            <div className="text-center">
              <span className="px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-lg sm:text-xl font-bold block text-white shadow-sm">
                {formatDigit(timeLeft.minutes)}
              </span>
              <span className="text-[9px] text-stone-400 uppercase font-semibold mt-0.5 block">MIN</span>
            </div>

            <span className="text-xl font-bold text-stone-400 font-serif leading-none mb-3">:</span>

            <div className="text-center">
              <span
                className={`px-2.5 py-1.5 bg-stone-900 border rounded-lg text-lg sm:text-xl font-bold block shadow-sm ${
                  allTasksDone
                    ? 'border-emerald-700 text-emerald-400'
                    : 'border-amber-700 text-warning-amber'
                }`}
              >
                {formatDigit(timeLeft.seconds)}
              </span>
              <span className="text-[9px] text-stone-400 uppercase font-semibold mt-0.5 block">SEC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownWidget;
