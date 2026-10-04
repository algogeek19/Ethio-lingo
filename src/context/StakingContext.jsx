import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../services/api';
import { useRole } from './RoleContext';
import { storage } from '../services/storage';

const StakingContext = createContext();

export const CURRICULUM_LEVELS = [
  'Beginner I',
  'Beginner II',
  'Intermediate I',
  'Intermediate II',
  'Advanced I',
  'Advanced II',
];

// localStorage key prefix for the per-user/per-day task completion cache.
const TASK_MIRROR_KEY = 'birrend_task_mirror';

// How often to re-read task progress from the API while a tab is visible.
const WORKSPACE_SYNC_INTERVAL_MS = 30000;

// How long a just-completed task is protected from being un-ticked by a read
// that was already in flight when the completion was confirmed.
const COMPLETION_GRACE_MS = 8000;

export const StakingProvider = ({ children }) => {
  const { authUser, updateUserProfile } = useRole();

  // Staking Wallet State.
  //
  // The localStorage entry is a render-speed cache only; the API is the sole
  // source of truth for a real balance. It previously fell back to a hardcoded
  // 900.0 when the cache was absent, so a learner on a fresh browser, a cleared
  // cache, or a failed wallet fetch was shown a 900 ETB vault that never existed
  // — which reads as the balance resetting to its initial value on every reload.
  // Absent a cache we start at zero and report `isWalletLoading`, so callers show
  // a loading state rather than an invented number.
  const [stakedBalance, setStakedBalance] = useState(() => {
    const userKey = authUser?.id || authUser?.email || 'default_learner';
    const savedBal = localStorage.getItem(`birrend_staked_balance_${userKey}`);
    const parsed = savedBal === null ? NaN : parseFloat(savedBal);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [availableYieldBalance, setAvailableYieldBalance] = useState(0.0);
  const [totalPenaltiesSlashed, setTotalPenaltiesSlashed] = useState(0.0);
  const [totalPlatformFees, setTotalPlatformFees] = useState(0.0);
  const [isFreeTrialMode, setIsFreeTrialMode] = useState(() => {
    if (authUser && authUser.isFreeTrial !== undefined) {
      return !!authUser.isFreeTrial;
    }
    return false;
  });
  const [freeTrialDaysLeft, setFreeTrialDaysLeft] = useState(7);

  // Learner Streak & Level State
  const [streak, setStreak] = useState({ count: 0, lastCompletedDate: null });
  const [currentLevel, setCurrentLevel] = useState(() => authUser?.level || 'Beginner I');
  
  // Persistent Current Module Day State (prioritizes DB currentDay over stale local storage)
  const [currentModuleDay, setCurrentModuleDay] = useState(() => authUser?.currentDay || 1);

  // Sync current user level & current day directly from authUser
  useEffect(() => {
    if (!authUser) return;
    if (authUser.level) {
      setCurrentLevel(authUser.level);
    }
    if (authUser.currentDay !== undefined && authUser.currentDay !== null) {
      setCurrentModuleDay(authUser.currentDay);
    }
    if (authUser.isFreeTrial !== undefined) {
      setIsFreeTrialMode(!!authUser.isFreeTrial);
    }
  }, [authUser?.id, authUser?.level, authUser?.currentDay, authUser?.isFreeTrial]);

  // Sync module day to localStorage whenever currentModuleDay changes
  useEffect(() => {
    if (!authUser) return;
    const userKey = authUser.id || authUser.email || 'default_learner';
    localStorage.setItem(`birrend_module_day_${userKey}`, currentModuleDay.toString());
  }, [authUser?.id, currentModuleDay]);

  // Daily Tasks Completion State for current day. Seeded and kept in sync with a
  // per-user/per-module local mirror further down, so a reload shows the last
  // known state immediately rather than flashing "nothing done" while the API
  // request is still in flight.
  const [dailyTasks, setDailyTasks] = useState({
    lesson: false,
    video: false,
    exam: false,
  });

  // Tasks completed in this tab, with the moment they were confirmed. A read
  // that lands inside this window is not allowed to un-tick them: the write and
  // the read are two separate requests, so a read dispatched straight after the
  // write can still observe the pre-write row and snap the badge back to
  // "Pending" a fraction of a second after the learner finished the video. The
  // window is short, so it only masks that race and never overrides a genuine
  // server state later on.
  const recentCompletionsRef = useRef({});
  const lastMirroredKeyRef = useRef(null);

  const withCompletionGrace = (serverState) => {
    const now = Date.now();
    const recent = recentCompletionsRef.current;
    const result = { ...serverState };

    for (const task of ['lesson', 'video', 'exam']) {
      const at = recent[task];
      if (at) {
        if (now - at <= COMPLETION_GRACE_MS) {
          if (!result[task]) result[task] = true;
        } else {
          delete recent[task];
        }
      }
    }

    return result;
  };

  // Transactions Ledger State
  const [ledgerTransactions, setLedgerTransactions] = useState([]);

  // Withdrawal Requests State
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);

  // Question Banks State map
  const [questionBanks, setQuestionBanks] = useState({});

  // Fetch initial wallet & ledger from Express API on mount / auth change
  const loadWalletData = async () => {
    if (!authUser || authUser.role === 'admin') {
      setIsWalletLoading(false);
      return;
    }
    const userKey = authUser.id || authUser.email || 'default_learner';
    try {
      const response = await api.getWallet();
      if (response.success && response.data) {
        const { wallet, transactions } = response.data;
        if (wallet) {
          setStakedBalance(wallet.stakedAmount ?? 0.0);
          setTotalPenaltiesSlashed(wallet.totalPenalties ?? 0.0);
          setTotalPlatformFees(wallet.totalPlatformFees ?? 0.0);
          setStreak({ count: wallet.streakCount ?? 0, lastCompletedDate: null });

          // Refresh the render-speed cache from the authoritative value. It was
          // only ever written by optimistic mutations, so a learner who had not
          // deposited in this browser had no cache entry at all — which is what
          // exposed the hardcoded fallback on reload.
          try {
            localStorage.setItem(
              `birrend_staked_balance_${userKey}`,
              String(wallet.stakedAmount ?? 0.0)
            );
          } catch {
            /* private browsing / quota — the cache is optional */
          }

          const isPending = authUser?.status === 'PENDING_APPROVAL' || authUser?.status === 'PENDING_DEPOSIT';
          const isNowTrial = isPending ? false : (wallet.isFreeTrial ?? false);
          setIsFreeTrialMode(isNowTrial);
          setFreeTrialDaysLeft(wallet.freeTrialDaysLeft ?? 7);

          // If converting from Free Trial to Staked Mode, sync currentDay and level from authUser
          if (!isNowTrial && authUser) {
            if (authUser.currentDay !== undefined) {
              setCurrentModuleDay(authUser.currentDay);
              localStorage.setItem(`birrend_module_day_${userKey}`, authUser.currentDay.toString());
            }
            if (authUser.level) {
              setCurrentLevel(authUser.level);
              localStorage.setItem(`birrend_user_level_${userKey}`, authUser.level);
            }
          }
        }
        if (transactions) setLedgerTransactions(transactions);
      }
    } catch (err) {
      // Leave the cached value in place rather than zeroing it: a transient
      // failure must not make a real balance look like it was wiped.
      console.error('Error fetching wallet from API:', err);
    } finally {
      setIsWalletLoading(false);
    }
  };

  useEffect(() => {
    if (!authUser || authUser.role === 'admin') return;

    const loadWithdrawals = async () => {
      try {
        const res = await api.getMyWithdrawalRequests();
        if (res.success && res.data) {
          setWithdrawalRequests(res.data);
        }
      } catch (err) {}
    };

    loadWalletData();
    loadWithdrawals();

    // Throttled Tab Focus & Visibility background revalidation (max once per 10s)
    let lastSync = Date.now();
    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastSync > 10000) {
          lastSync = now;
          loadWalletData();
          loadWithdrawals();
          // Task progress has its own focus/interval sync further down.
        }
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [authUser?.id]);

  // Daily Workspace Module Data State
  const [workspaceModule, setWorkspaceModule] = useState(null);
  const [levelBooks, setLevelBooks] = useState([]);

  // The level/day the API must be asked about, and the key the local mirror is
  // stored under, resolved once here so every caller agrees.
  const syncTarget = useMemo(() => {
    if (!authUser || authUser.role === 'admin') return null;
    const level = isFreeTrialMode ? 'Free Trial' : (authUser.level || currentLevel);
    const day = (isFreeTrialMode || authUser.currentDay === undefined || authUser.currentDay === null)
      ? currentModuleDay
      : authUser.currentDay;
    const key = authUser.id || authUser.email
      ? `${TASK_MIRROR_KEY}_${authUser.id || authUser.email}_${level}_${day}`
      : null;
    return { level, day, key };
  }, [authUser?.id, authUser?.email, authUser?.level, authUser?.currentDay, authUser?.role, currentLevel, currentModuleDay, isFreeTrialMode]);

  // `updateModuleDay` is re-created on every render, so putting it in the
  // callback's dependency list would change the callback identity on every
  // render and make the sync effect below re-fetch forever. A ref keeps the
  // callback stable while still reaching the latest setter.
  const updateModuleDayRef = useRef(null);

  // One shared refresh, driven by whatever the current sync target is. The
  // function identity changes with the target so effects depending on it
  // re-run exactly when the module or account changes.
  const refreshWorkspaceProgress = useCallback(async () => {
    if (!syncTarget) return;
    const { level, day, key } = syncTarget;
    try {
      // Ask for exactly the level/day the mirror key is built from. Passing
      // currentLevel here while the key used authUser.level (or vice versa)
      // wrote the completion flag under one module and read it back under
      // another, which is exactly "I completed it and it shows as not done".
      const res = await api.getDailyWorkspace(level, day);
      if (res?.success && res.data) {
        if (res.data.module) setWorkspaceModule(res.data.module);
        if (res.data.levelBooks) setLevelBooks(res.data.levelBooks);

        // The server decides which day is actually unlocked, and now returns it.
        // Adopting it here is what makes the rollover visible: when midnight
        // passes the next fetch moves the learner onto the new day's material
        // instead of replaying yesterday's. Without this the client kept asking
        // for its own stale day and never left it.
        const serverDay = res.data.currentDay;
        if (typeof serverDay === 'number' && serverDay !== syncTarget.day) {
          if (updateModuleDayRef.current) updateModuleDayRef.current(serverDay);
        }

        if (res.data.progress) {
          const p = res.data.progress;
          setDailyTasks(withCompletionGrace({
            lesson: !!p.task1LessonCompleted,
            video: !!p.task2ListeningCompleted,
            exam: !!(p.examCompleted && p.examPassed),
          }));
          return;
        }
      }
      // The API answered but carried no progress for this user/level/day. Clear
      // the mirror too, otherwise a cached tick from a previous module would
      // keep showing as complete.
      if (key) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* cache is optional */
        }
      }
      setDailyTasks(withCompletionGrace({ lesson: false, video: false, exam: false }));
    } catch (err) {
      // Leave the last known state alone. Wiping it here is what made a brief
      // network blip look like the learner lost their completed tasks.
      console.error('Error fetching workspace task progress from API:', err);
    }
  }, [syncTarget]);

  // Fetch task progress from the API whenever the target module or account
  // changes, and keep it fresh afterwards: a task completed in another tab or
  // on another device had no path into this one until a full reload, which is
  // what "the tracker does not update in real time" describes.
  useEffect(() => {
    if (!syncTarget) return undefined;

    refreshWorkspaceProgress();

    const onVisible = () => {
      if (!document.hidden) refreshWorkspaceProgress();
    };
    const id = setInterval(onVisible, WORKSPACE_SYNC_INTERVAL_MS);
    window.addEventListener('focus', refreshWorkspaceProgress);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', refreshWorkspaceProgress);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncTarget, refreshWorkspaceProgress]);

  // Seed from (and keep) the local mirror for the current target, so a reload
  // does not flash a reset tracker. The server response above overwrites it as
  // soon as it arrives, so this is presentation only.
  useEffect(() => {
    if (!syncTarget?.key) {
      setDailyTasks({ lesson: false, video: false, exam: false });
      return;
    }
    try {
      const raw = localStorage.getItem(syncTarget.key);
      const parsed = raw ? JSON.parse(raw) : null;
      setDailyTasks({
        lesson: !!parsed?.lesson,
        video: !!parsed?.video,
        exam: !!parsed?.exam,
      });
    } catch {
      setDailyTasks({ lesson: false, video: false, exam: false });
    }
  }, [syncTarget?.key]);

  useEffect(() => {
    if (!syncTarget?.key) return;
    // On the first pass for a key, the seed effect above has just queued its
    // setDailyTasks but this effect still closes over the previous value. Writing
    // that stale value back would destroy the very mirror we just read, so skip
    // until the state has actually been seeded from storage.
    if (lastMirroredKeyRef.current !== syncTarget.key) {
      lastMirroredKeyRef.current = syncTarget.key;
      return;
    }
    try {
      localStorage.setItem(syncTarget.key, JSON.stringify(dailyTasks));
    } catch {
      /* private browsing / quota — the cache is optional */
    }
  }, [syncTarget?.key, dailyTasks]);

  // Complete a workspace task (lesson | video | exam)
  const completeTask = async (taskType, extraData = {}) => {
    const keyMap = {
      task1: 'lesson',
      lesson: 'lesson',
      task2: 'video',
      video: 'video',
      task3: 'exam',
      exam: 'exam',
    };
    const normalizedKey = keyMap[taskType] || taskType;

    // Optimistic UI update
    setDailyTasks((prev) => ({
      ...prev,
      [normalizedKey]: true,
    }));

    // Write to the same level/day the read path uses. These two disagreed:
    // completion was written under currentLevel/currentModuleDay but read back
    // under authUser.level/authUser.currentDay, so a learner who completed a
    // task saw it revert on the next load.
    const { level: writeLevel, day: writeDay } = syncTarget || {
      level: isFreeTrialMode ? 'Free Trial' : currentLevel,
      day: currentModuleDay,
    };
    try {
      await api.completeTask(writeLevel, writeDay, taskType, extraData.seconds || 180, extraData);
      // Start the grace window only once the server has confirmed the write,
      // so the re-sync below cannot un-tick the task it just completed.
      recentCompletionsRef.current[normalizedKey] = Date.now();
      if (isFreeTrialMode && currentModuleDay >= 7 && (normalizedKey === 'exam' || taskType === 'exam')) {
        setFreeTrialDaysLeft(0);
        await loadWalletData();
      }
      // Re-sync progress from API
      await refreshWorkspaceProgress();
    } catch (err) {
      // The optimistic tick above is now a lie: the server rejected or never
      // received it, so roll it back rather than showing a task as complete
      // that the next page load will silently un-complete.
      console.error('Failed to update task completion in DB:', err);
      setDailyTasks((prev) => ({ ...prev, [normalizedKey]: false }));
    }
  };

  // Submit exam and update task & wallet state from API
  const submitExam = async (correctCount, passed) => {
    setDailyTasks((prev) => ({
      ...prev,
      exam: passed === true,
    }));
    await loadWalletData();
  };

  // Change or update current module day (1 to 30) with DB sync
  const updateModuleDay = (dayNum) => {
    const validDay = Math.min(30, Math.max(1, dayNum));
    setCurrentModuleDay(validDay);
    const userKey = authUser?.id || authUser?.email || 'default_learner';
    storage.setItem(`birrend_module_day_${userKey}`, validDay.toString());
    if (updateUserProfile) {
      updateUserProfile({ currentDay: validDay });
    }
  };

  // Keep the stable-callback ref pointed at the current setter.
  updateModuleDayRef.current = updateModuleDay;

  // Advance to Next Module Day (Day N -> Day N+1)
  const advanceToNextDay = async () => {
    if (isFreeTrialMode) {
      if (currentModuleDay < 7) {
        const nextTrialDay = currentModuleDay + 1;
        updateModuleDay(nextTrialDay);
        const daysLeft = Math.max(0, 7 - (nextTrialDay - 1));
        setFreeTrialDaysLeft(daysLeft);
      } else {
        setFreeTrialDaysLeft(0);
      }
      setDailyTasks({ lesson: false, video: false, exam: false });
      setTimeout(() => {
        loadWalletData();
      }, 500);
    } else if (currentModuleDay < 30) {
      const nextDay = currentModuleDay + 1;
      updateModuleDay(nextDay);
      setDailyTasks({ lesson: false, video: false, exam: false });
    } else {
      // Completed all 30 days of the level! Advance to next level
      advanceToNextLevel();
    }
  };

  // Deposit funds into vault via API
  const depositToVault = async (amount = 1000.0) => {
    try {
      const res = await api.deposit(amount);
      if (res.success && res.data) {
        const w = res.data;
        const newStaked = w.stakedAmount ?? (stakedBalance + amount);
        setStakedBalance(newStaked);
        setTotalPlatformFees(w.totalPlatformFees ?? 0.0);
        setIsFreeTrialMode(false);
        const userKey = authUser?.id || authUser?.email || 'default_learner';
        localStorage.setItem(`birrend_staked_balance_${userKey}`, newStaked.toString());
        return { success: true, data: w };
      }
      return { success: false, message: res.message };
    } catch (err) {
      // Do NOT credit the local balance when the deposit failed. This branch
      // used to add the amount anyway and report success, so a failed payment
      // inflated the displayed vault and cleared free-trial mode against money
      // that never arrived. Re-read the server so the UI reflects reality.
      console.error('Deposit failed:', err);
      await loadWalletData();
      return { success: false, message: err?.message || 'Deposit failed. Your balance has not changed.' };
    }
  };

  // Submit withdrawal request via API
  const submitWithdrawalRequest = async (requestData) => {
    try {
      const res = await api.requestWithdrawal(requestData);
      if (res.success && res.data) {
        setWithdrawalRequests((prev) => [res.data, ...prev]);

        // The stake is NOT deducted client-side. The request is pending admin
        // verification, and the server owns the ledger; deducting here made the
        // displayed balance disagree with the stored one and snap back on the
        // next reload — the balance appearing to reset. Re-read instead.
        await loadWalletData();

        // Upgrade user level to next level (Day 1) for returning journey
        advanceToNextLevel();

        return { success: true, request: res.data };
      }
      return { success: false, message: res.message };
    } catch (err) {
      // A failed request must not advance the learner to the next level.
      console.error('Withdrawal request failed:', err);
      return { success: false, message: err.message || 'Withdrawal request failed.' };
    }
  };

  // Advance to next level in 6-level curriculum
  const advanceToNextLevel = () => {
    const currentIdx = CURRICULUM_LEVELS.indexOf(currentLevel);
    if (currentIdx < CURRICULUM_LEVELS.length - 1) {
      const nextLvl = CURRICULUM_LEVELS[currentIdx + 1];
      setCurrentLevel(nextLvl);
      const userKey = authUser?.id || authUser?.email || 'default_learner';
      localStorage.setItem(`birrend_user_level_${userKey}`, nextLvl);
      localStorage.setItem(`birrend_module_day_${userKey}`, '1');
      if (updateUserProfile) {
        updateUserProfile({ level: nextLvl, currentDay: 1 });
      }
      setCurrentModuleDay(1);
      setDailyTasks({ lesson: false, video: false, exam: false });
      return { success: true, nextLevel: nextLvl };
    }
    return { success: false, message: 'You have completed all curriculum levels!' };
  };

  // Import question bank JSON array via API
  const importQuestionBankJson = async (jsonArray) => {
    const res = await api.importQuestions(jsonArray);
    if (res.success && res.data) {
      return res.data.importedCount || (Array.isArray(jsonArray) ? jsonArray.length : (jsonArray.questions ? jsonArray.questions.length : 1));
    }
  };

  // Exam Failure Penalty (-25 ETB)
  const applyExamFailPenalty = async () => {
    // Optimistic tick for responsiveness only. If the write fails we re-read the
    // server rather than leaving a deduction on screen that never happened —
    // that fabricated balance was also written to localStorage, so it survived
    // reloads and looked like a real, escalating penalty.
    setStakedBalance((prev) => Math.max(0, prev - 25.0));
    setTotalPenaltiesSlashed((prev) => prev + 25.0);
    try {
      await api.applyExamFailPenalty();
    } catch (err) {
      console.error('API applyExamFailPenalty error:', err);
    } finally {
      await loadWalletData();
    }
  };

  // Missed Day Window Penalty (-80 ETB & Streak Reset)
  const applyMissedDayPenalty = async () => {
    // The server is the only thing that may move a real balance. This used to
    // subtract 80 ETB locally on both the "no data" and the thrown branches,
    // so a failed request still showed (and cached) money that was never taken.
    let applied = false;
    try {
      const res = await api.applyMissedDayPenalty();
      if (res && res.success && res.data) {
        applied = true;
        const w = res.data;
        setStakedBalance(w.stakedAmount ?? 0.0);
        setTotalPenaltiesSlashed(w.totalPenalties ?? 0.0);
      }
    } catch (err) {
      console.error('API applyMissedDayPenalty error:', err);
    }

    if (applied) {
      setStreak({ count: 0, lastCompletedDate: null });
      setDailyTasks({ lesson: false, video: false, exam: false });
      await refreshWorkspaceProgress();
    }

    // Always reconcile with the server so the displayed balance matches the
    // ledger whether or not the request went through.
    await loadWalletData();
  };

  // Advance Streak (Free Trial accounts do not accrue streaks)
  const advanceStreak = async () => {
    if (isFreeTrialMode) {
      setStreak({ count: 0, lastCompletedDate: null });
      return;
    }
    setStreak((prev) => ({ ...prev, count: (prev?.count || 0) + 1 }));
    try {
      await api.advanceStreak();
      await loadWalletData();
    } catch (err) {
      console.error('API advanceStreak error:', err);
    }
  };

  const setInitialLevel = (level) => {
    if (CURRICULUM_LEVELS.includes(level)) {
      setCurrentLevel(level);
    }
  };

  const toggleFreeTrialMode = (isTrial) => {
    setIsFreeTrialMode(isTrial);
  };

  // Wallet Object for components that access wallet.stakedAmount
  const walletObj = {
    stakedAmount: stakedBalance,
    yieldBalance: availableYieldBalance,
    totalPenalties: totalPenaltiesSlashed,
    totalPlatformFees: totalPlatformFees,
    isFreeTrial: isFreeTrialMode,
    freeTrialDaysLeft,
  };

  // User Object from auth context
  const userObj = {
    name: authUser?.name || '',
    email: authUser?.email || '',
    role: authUser?.role || 'learner',
    level: currentLevel || authUser?.level || 'Beginner I',
    avatar: authUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  };

  return (
    <StakingContext.Provider
      value={{
        wallet: walletObj,
        user: userObj,
        stakedBalance,
        availableYieldBalance,
        totalPenaltiesSlashed,
        totalPlatformFees,
        // Deliberately false while the wallet is still being fetched. Starting
        // from a placeholder balance would otherwise trip this flag and flash
        // the "your stake is 0, curriculum locked" screen at every signed-in
        // learner on first paint.
        isWalletLoading,
        isBalanceZero: !isWalletLoading && stakedBalance <= 0 && !isFreeTrialMode,
        isFreeTrialMode,
        freeTrialDaysLeft,
        setFreeTrialDaysLeft,
        trialDay: currentModuleDay,
        streak,
        currentLevel,
        currentModuleDay,
        dailyTasks,
        ledgerTransactions,
        withdrawalRequests,
        questionBanks,
        workspaceModule,
        levelBooks,
        completeTask,
        submitExam,
        depositToVault,
        submitWithdrawalRequest,
        requestWithdrawal: submitWithdrawalRequest,
        advanceToNextDay,
        advanceToNextLevel,
        importQuestionBankJson,
        applyExamFailPenalty,
        applyMissedDayPenalty,
        advanceStreak,
        setInitialLevel,
        toggleFreeTrialMode,
        setStreak,
        refreshWorkspaceProgress,
        setCurrentModuleDay: updateModuleDay,
        updateModuleDay,
      }}
    >
      {children}
    </StakingContext.Provider>
  );
};

export const useStaking = () => {
  const context = useContext(StakingContext);
  if (!context) {
    throw new Error('useStaking must be used within a StakingProvider');
  }
  return context;
};
