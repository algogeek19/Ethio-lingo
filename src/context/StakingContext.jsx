import React, { createContext, useContext, useState, useEffect } from 'react';
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

export const StakingProvider = ({ children }) => {
  const { authUser, updateUserProfile } = useRole();

  // Staking Wallet State
  const [stakedBalance, setStakedBalance] = useState(() => {
    const userKey = authUser?.id || authUser?.email || 'default_learner';
    const savedBal = localStorage.getItem(`birrend_staked_balance_${userKey}`);
    return savedBal !== null ? parseFloat(savedBal) : 900.0;
  });
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

  // Daily Tasks Completion State for current day
  const [dailyTasks, setDailyTasks] = useState({
    lesson: false,
    video: false,
    pdf: false,
    exam: false,
  });

  // Transactions Ledger State
  const [ledgerTransactions, setLedgerTransactions] = useState([]);

  // Withdrawal Requests State
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);

  // Question Banks State map
  const [questionBanks, setQuestionBanks] = useState({});

  // Fetch initial wallet & ledger from Express API on mount / auth change
  const loadWalletData = async () => {
    if (!authUser || authUser.role === 'admin') return;
    try {
      const response = await api.getWallet();
      if (response.success && response.data) {
        const { wallet, transactions } = response.data;
        if (wallet) {
          setStakedBalance(wallet.stakedAmount ?? 0.0);
          setTotalPenaltiesSlashed(wallet.totalPenalties ?? 0.0);
          setTotalPlatformFees(wallet.totalPlatformFees ?? 0.0);
          setStreak({ count: wallet.streakCount ?? 0, lastCompletedDate: null });

          const isPending = authUser?.status === 'PENDING_APPROVAL' || authUser?.status === 'PENDING_DEPOSIT';
          const isNowTrial = isPending ? false : (wallet.isFreeTrial ?? false);
          setIsFreeTrialMode(isNowTrial);
          setFreeTrialDaysLeft(wallet.freeTrialDaysLeft ?? 7);

          // If converting from Free Trial to Staked Mode, sync currentDay and level from authUser
          if (!isNowTrial && authUser) {
            const userKey = authUser.id || authUser.email || 'default_learner';
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
    } catch (err) {}
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
          refreshWorkspaceProgress();
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

  const refreshWorkspaceProgress = async () => {
    if (!authUser || authUser.role === 'admin') return;
    try {
      const activeLevelStr = isFreeTrialMode ? 'Free Trial' : (authUser.level || currentLevel);
      const targetDay = (isFreeTrialMode || authUser.currentDay === undefined || authUser.currentDay === null)
        ? currentModuleDay
        : authUser.currentDay;
      const res = await api.getDailyWorkspace(activeLevelStr, targetDay);
      if (res.success && res.data) {
        if (res.data.module) setWorkspaceModule(res.data.module);
        if (res.data.levelBooks) setLevelBooks(res.data.levelBooks);
        if (res.data.progress) {
          const p = res.data.progress;
          setDailyTasks({
            lesson: !!p.task1LessonCompleted,
            video: !!p.task2ListeningCompleted,
            pdf: !!p.task3ReadingCompleted,
            exam: !!(p.examCompleted && p.examPassed),
          });
        }
      } else {
        setDailyTasks({ lesson: false, video: false, pdf: false, exam: false });
      }
    } catch (err) {
      console.error('Error fetching workspace task progress from API:', err);
    }
  };

  // Fetch task progress from Express API whenever level or day changes
  useEffect(() => {
    if (!authUser || authUser.role === 'admin') return;
    refreshWorkspaceProgress();
  }, [authUser?.id, currentLevel, currentModuleDay, isFreeTrialMode]);

  // Complete a workspace task (lesson | video | pdf | exam)
  const completeTask = async (taskType, extraData = {}) => {
    const keyMap = {
      task1: 'lesson',
      lesson: 'lesson',
      task2: 'video',
      video: 'video',
      task3: 'pdf',
      pdf: 'pdf',
      task4: 'exam',
      exam: 'exam',
    };
    const normalizedKey = keyMap[taskType] || taskType;

    // Optimistic UI update
    setDailyTasks((prev) => ({
      ...prev,
      [normalizedKey]: true,
    }));

    try {
      const activeLevelStr = isFreeTrialMode ? 'Free Trial' : currentLevel;
      await api.completeTask(activeLevelStr, currentModuleDay, taskType, extraData.seconds || 180, extraData);
      if (isFreeTrialMode && currentModuleDay >= 7 && (normalizedKey === 'exam' || taskType === 'exam')) {
        setFreeTrialDaysLeft(0);
        await loadWalletData();
      }
      // Re-sync progress from API
      await refreshWorkspaceProgress();
    } catch (err) {
      console.error('Failed to update task completion in DB:', err);
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
      setDailyTasks({ lesson: false, video: false, pdf: false, exam: false });
      setTimeout(() => {
        loadWalletData();
      }, 500);
    } else if (currentModuleDay < 30) {
      const nextDay = currentModuleDay + 1;
      updateModuleDay(nextDay);
      setDailyTasks({ lesson: false, video: false, pdf: false, exam: false });
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
      const netDeposit = amount;
      const newStaked = stakedBalance + netDeposit;
      setStakedBalance(newStaked);
      setIsFreeTrialMode(false);
      const userKey = authUser?.id || authUser?.email || 'default_learner';
      localStorage.setItem(`birrend_staked_balance_${userKey}`, newStaked.toString());
      return { success: true, data: { stakedAmount: newStaked } };
    }
  };

  // Submit withdrawal request via API
  const submitWithdrawalRequest = async (requestData) => {
    try {
      const res = await api.requestWithdrawal(requestData);
      if (res.success && res.data) {
        setWithdrawalRequests((prev) => [res.data, ...prev]);
        // Deduct requested withdrawal amount from staked balance and persist to localStorage
        const deductAmount = requestData?.amount || stakedBalance || 1000.0;
        setStakedBalance((prev) => {
          const newBal = Math.max(0, prev - deductAmount);
          const userKey = authUser?.id || authUser?.email || 'default_learner';
          localStorage.setItem(`birrend_staked_balance_${userKey}`, newBal.toString());
          return newBal;
        });

        // Upgrade user level to next level (Day 1) for returning journey
        advanceToNextLevel();

        return { success: true, request: res.data };
      }
      return { success: false, message: res.message };
    } catch (err) {
      advanceToNextLevel();
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
      setDailyTasks({ lesson: false, video: false, pdf: false, exam: false });
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
    setStakedBalance((prev) => {
      const newBal = Math.max(0, prev - 25.0);
      const userKey = authUser?.id || authUser?.email || 'default_learner';
      localStorage.setItem(`birrend_staked_balance_${userKey}`, newBal.toString());
      return newBal;
    });
    setTotalPenaltiesSlashed((prev) => prev + 25.0);
    try {
      await api.applyExamFailPenalty();
      await loadWalletData();
    } catch (err) {
      console.error('API applyExamFailPenalty error:', err);
    }
  };

  // Missed Day Window Penalty (-80 ETB & Streak Reset)
  const applyMissedDayPenalty = async () => {
    try {
      const res = await api.applyMissedDayPenalty();
      if (res && res.success && res.data) {
        const w = res.data;
        const newBal = w.stakedAmount ?? 0.0;
        setStakedBalance(newBal);
        setTotalPenaltiesSlashed(w.totalPenalties ?? 0.0);
        const userKey = authUser?.id || authUser?.email || 'default_learner';
        localStorage.setItem(`birrend_staked_balance_${userKey}`, newBal.toString());
      } else {
        const penalty = 80.0;
        setStakedBalance((prev) => {
          const newBal = Math.max(0, prev - penalty);
          const userKey = authUser?.id || authUser?.email || 'default_learner';
          localStorage.setItem(`birrend_staked_balance_${userKey}`, newBal.toString());
          return newBal;
        });
        setTotalPenaltiesSlashed((prev) => prev + penalty);
      }
      setStreak({ count: 0, lastCompletedDate: null });
      setDailyTasks({ lesson: false, video: false, pdf: false, exam: false });
      await refreshWorkspaceProgress();
    } catch (err) {
      console.error('API applyMissedDayPenalty error:', err);
      const penalty = 80.0;
      setStakedBalance((prev) => {
        const newBal = Math.max(0, prev - penalty);
        const userKey = authUser?.id || authUser?.email || 'default_learner';
        localStorage.setItem(`birrend_staked_balance_${userKey}`, newBal.toString());
        return newBal;
      });
      setTotalPenaltiesSlashed((prev) => prev + penalty);
      setStreak({ count: 0, lastCompletedDate: null });
      setDailyTasks({ lesson: false, video: false, pdf: false, exam: false });
    }
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
        isBalanceZero: stakedBalance <= 0 && !isFreeTrialMode,
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
