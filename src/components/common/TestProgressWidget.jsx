import React, { useState } from 'react';
import { useStaking } from '../../context/StakingContext';
import { FastForward, CheckCircle2, RotateCcw, Wrench, X, ShieldCheck, Flame, AlertTriangle } from 'lucide-react';

const TestProgressWidget = () => {
  const {
    currentModuleDay,
    setCurrentModuleDay,
    completeTask,
    advanceStreak,
    advanceToNextDay,
    applyMissedDayPenalty,
    freeTrialDaysLeft,
    setFreeTrialDaysLeft,
    depositToVault,
    isFreeTrialMode,
    user,
  } = useStaking();
  const [isOpen, setIsOpen] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState('');

  const userKey = user?.id || user?.email || 'default_learner';

  const handleJumpToDay = (dayNum) => {
    setCurrentModuleDay(dayNum);
    localStorage.setItem(`birrend_module_day_${userKey}`, dayNum.toString());
    setTestSuccessMsg(`Jumped to Day ${dayNum}!`);
    setTimeout(() => setTestSuccessMsg(''), 3000);
  };

  const handleCompleteAllTasks = async () => {
    await completeTask('lesson');
    await completeTask('video');
    await completeTask('pdf', { seconds: 1200 });
    await completeTask('exam', { passed: true, score: 20, examCompleted: true, examPassed: true });
    setTestSuccessMsg('All 4 daily tasks (including Exam!) marked complete!');
    setTimeout(() => setTestSuccessMsg(''), 3000);
  };

  const handleSimulateDeposit = async () => {
    try {
      await depositToVault(1000.0);
      setTestSuccessMsg(`🎉 Upgraded to Staked Escrow Tier! Day 1 of ${user?.level || 'Beginner I'} Unlocked.`);
      setTimeout(() => setTestSuccessMsg(''), 4000);
    } catch (err) {
      setTestSuccessMsg('Deposit simulation error');
    }
  };

  const handleSimulateMidnightSuccess = () => {
    advanceStreak();
    if (isFreeTrialMode) {
      if (setFreeTrialDaysLeft) setFreeTrialDaysLeft((prev) => Math.max(0, (prev ?? 3) - 1));
      const nextTrialDay = Math.min(3, currentModuleDay + 1);
      handleJumpToDay(nextTrialDay);
      setTestSuccessMsg(`⚡ Midnight Passed! Unlocked Free Trial Day ${nextTrialDay} of 3.`);
    } else if (currentModuleDay >= 30) {
      advanceToNextLevel();
      setTestSuccessMsg('⚡ Level Completed (Day 30)! Advanced to Day 1 of Next Level.');
    } else {
      advanceToNextDay();
      setTestSuccessMsg(`⚡ Midnight Passed! Streak advanced (+1 Day) & Day ${currentModuleDay + 1} unlocked.`);
    }
    setTimeout(() => setTestSuccessMsg(''), 4000);
  };

  const handleSimulateMissedDay = () => {
    applyMissedDayPenalty();
    setTestSuccessMsg('⚠️ Missed Day Simulated! -80 ETB slashed from escrow & streak reset to 0.');
    setTimeout(() => setTestSuccessMsg(''), 4000);
  };

  const handleFastForwardTrial = () => {
    advanceToNextDay();
    const nextDay = Math.min(3, currentModuleDay + 1);
    setTestSuccessMsg(`Fast-Forwarded Free Trial: Unlocked Day ${nextDay} of 3 & deducted 1 trial day!`);
    setTimeout(() => setTestSuccessMsg(''), 4000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 transition-colors duration-250">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3.5 py-2 bg-[#181715] hover:bg-stone-800 text-warning-amber border border-stone-800 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono font-bold transition-all hover:scale-105 cursor-pointer focus-ring"
        >
          <Wrench size={16} />
          <span>Test Controls</span>
        </button>
      ) : (
        <div className="w-80 bg-[#181715] text-white border border-stone-800 rounded-2xl p-4 shadow-2xl space-y-4 text-xs font-mono">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-warning-amber font-bold">
              <FastForward size={16} />
              <span>Daily Progress Testing Tool</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Success Banner */}
          {testSuccessMsg && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-300 text-[11px] text-center font-bold animate-pulse">
              {testSuccessMsg}
            </div>
          )}

          {/* Section 1: Day Jumping */}
          <div className="space-y-2">
            <label className="block text-[11px] font-mono text-stone-400 font-bold uppercase">
              1. Jump Module Day
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 7, 15, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleJumpToDay(d)}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    currentModuleDay === d
                      ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-sm'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  Day {d}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Complete Workspace Tasks */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <label className="block text-[11px] font-mono text-stone-400 font-bold uppercase">
              2. Complete Workspace Tasks
            </label>
            <button
              onClick={handleCompleteAllTasks}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ShieldCheck size={16} />
              <span>Complete All 4 Tasks Today</span>
            </button>
          </div>

          {/* Section 3: Test Streak & Midnight Expiration */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <label className="block text-[11px] font-mono text-stone-400 font-bold uppercase">
              3. Test Streak & Trial Rules
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleSimulateDeposit}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <ShieldCheck size={15} />
                <span>💰 Deposit 1,000 ETB (Upgrade to Staked Day 1)</span>
              </button>

              <button
                onClick={handleSimulateMidnightSuccess}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Flame size={15} />
                <span>⚡ Pass Midnight (Streak +1 Day & Next Day)</span>
              </button>

              <button
                onClick={handleFastForwardTrial}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <FastForward size={15} />
                <span>⏩ Fast-Forward Free Trial (-1 Day Left)</span>
              </button>

              <button
                onClick={handleSimulateMissedDay}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <AlertTriangle size={15} />
                <span>⚠️ Fail Midnight (-80 ETB Penalty & Reset)</span>
              </button>
            </div>
          </div>

          {/* Custom Day Select Dropdown */}
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs font-mono text-stone-400">
            <span>Select Day (1–30):</span>
            <select
              value={currentModuleDay}
              onChange={(e) => handleJumpToDay(parseInt(e.target.value, 10))}
              className="px-3 py-1 bg-stone-900 border border-stone-700 text-white rounded-lg font-bold text-xs focus-ring"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d} {d === 30 ? '🏁 (Level Unlock)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestProgressWidget;
