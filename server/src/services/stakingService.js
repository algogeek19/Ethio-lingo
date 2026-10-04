import { prisma } from '../config/database.js';
import { getUserTodayStr } from '../utils/dateHelper.js';
import * as walletRepository from '../repositories/walletRepository.js';
import * as ledgerRepository from '../repositories/ledgerRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { AppError } from '../utils/AppError.js';

export const getWalletOverview = async (userId) => {
  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet) {
    throw new AppError('Escrow wallet not found for user.', 404);
  }
  const transactions = await ledgerRepository.findLedgerEntriesByUserId(userId);
  return { wallet, transactions };
};

export const processDeposit = async (userId, depositAmount = 1000.0, txRef = null) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet || !dbUser) {
    throw new AppError('Wallet or user not found.', 404);
  }

  const todayStr = getUserTodayStr(dbUser.timezone);
  const fee = 0.0; // 0% platform service fee (fully free)
  const netStake = depositAmount - fee; // full stake, no platform cut

  const newStake = wallet.stakedAmount + netStake;

  const updated = await walletRepository.updateWallet(userId, {
    stakedAmount: newStake,
    totalPlatformFees: wallet.totalPlatformFees + fee,
    isFreeTrial: false,
    freeTrialDaysLeft: 0,
    lastCompletedDate: todayStr,
    lastAuditedDate: todayStr,
  });

  // Reactivate user status and reset day to 1 on saved main level
  if (newStake >= 100.0) {
    await userRepository.updateUser(userId, {
      isActive: true,
      status: 'ACTIVE',
      currentDay: 1,
    });
  }

  await ledgerRepository.createLedgerEntry({
    userId,
    type: 'CHAPA_DEPOSIT',
    amount: depositAmount,
    status: 'COMPLETED',
    description: `Deposit of ${depositAmount} ETB (0% platform fee, Net Vault Stake: ${netStake} ETB)`,
    chapaTxRef: txRef || `tx_chapa_mock_${Date.now()}`,
  });

  return updated;
};

export const applyExamFailurePenalty = async (userId, penaltyAmount = 25.0) => {
  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet) return null;

  const newStake = Math.max(0, wallet.stakedAmount - penaltyAmount);
  const updated = await walletRepository.updateWallet(userId, {
    stakedAmount: newStake,
    totalPenalties: wallet.totalPenalties + penaltyAmount,
  });

  // Check if balance fell below 100 ETB
  if (newStake < 100.0) {
    await userRepository.updateUser(userId, {
      isActive: false,
      status: 'PENDING_DEPOSIT',
    });
  }

  await ledgerRepository.createLedgerEntry({
    userId,
    type: 'PENALTY_DEDUCTION',
    amount: penaltyAmount,
    status: 'PENALTY',
    description: `Exam failure penalty deduction (-${penaltyAmount} ETB)`,
  });

  return updated;
};

export const applyMissedDayStreakBreakPenalty = async (userId, penaltyAmount = 80.0) => {
  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet) return null;

  const currentStake = wallet.stakedAmount || 0.0;
  if (currentStake <= 0) {
    // Balance is 0, make sure streak is reset to 0
    return await walletRepository.updateWallet(userId, { streakCount: 0 });
  }

  // Deduct penaltyAmount (or whatever is left if currentStake < penaltyAmount)
  const actualDeduction = Math.min(currentStake, penaltyAmount);
  const newStake = Math.max(0, currentStake - actualDeduction);

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const todayStr = getUserTodayStr(dbUser?.timezone);

  const updated = await walletRepository.updateWallet(userId, {
    stakedAmount: newStake,
    totalPenalties: (wallet.totalPenalties || 0.0) + actualDeduction,
    streakCount: 0, // Reset streak count to 0
    lastAuditedDate: todayStr,
  });

  // Check if balance fell below 100 ETB requirement
  if (newStake < 100.0) {
    await userRepository.updateUser(userId, {
      isActive: false,
      status: 'PENDING_DEPOSIT',
    });
  }

  await ledgerRepository.createLedgerEntry({
    userId,
    type: 'PENALTY_DEDUCTION',
    amount: actualDeduction,
    status: 'PENALTY',
    description: `24h Missed Day Window Penalty (-${actualDeduction} ETB, streak reset to 0)`,
  });

  return updated;
};

/**
 * Advance the learner streak by exactly one day.
 *
 * Idempotent per calendar day, in the learner's own timezone. Passing the daily
 * exam already records the day in `examService.submitExamAnswers`, and the
 * client also calls this endpoint when the midnight countdown rolls over. Both
 * paths therefore land here for the same calendar day, so incrementing blindly
 * counted a single day twice and inflated the streak.
 *
 * Re-earning a day that has already been credited (a retake after a failed
 * attempt, or a double-clicked button) must not award a second day either, so
 * the guard is on the recorded completion date rather than on the caller.
 */
export const advanceUserStreak = async (userId) => {
  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const todayStr = getUserTodayStr(dbUser?.timezone);

  // Free Trial learners never accrue a streak, so there is nothing to credit.
  if (wallet.isFreeTrial) {
    return await walletRepository.updateWallet(userId, {
      streakCount: 0,
      lastAuditedDate: todayStr,
    });
  }

  // Already credited for today — return the unchanged wallet rather than
  // advancing a second time.
  if (wallet.lastCompletedDate === todayStr) {
    return wallet;
  }

  return await walletRepository.updateWallet(userId, {
    streakCount: (wallet.streakCount || 0) + 1,
    lastCompletedDate: todayStr,
    lastAuditedDate: todayStr,
  });
};

/**
 * Decide which module day a learner is entitled to be working on.
 *
 * This is the ONLY thing that advances a day. The client never does: the
 * workspace read calls this and the client adopts the returned currentDay. That
 * matters, because a client-side advance can be triggered by anything that
 * touches component state — it previously fired on every 1s tick after midnight,
 * and then (once that was fixed) on mount whenever the localStorage mirror said
 * all tasks were done, which advanced the day on a plain page reload.
 *
 * The rule:
 *   - Completed today, window still open  -> stay. Work earns the next day, it
 *     does not grant it.
 *   - Completed on an earlier date         -> advance exactly one day.
 *   - Window closed with tasks outstanding -> stay, and the missed-day penalty
 *     applies (see streakAuditService).
 *
 * Idempotent within a date, and never skips more than the single day earned.
 *
 * Returns the learner's current day after the check.
 */
export const syncLearnerModuleDay = async (userId, level, isFreeTrial) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) return 1;

  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet) return dbUser.currentDay || 1;

  const activeLevel = isFreeTrial ? 'Free Trial' : (level || dbUser.level || 'Beginner I');
  const maxDay = isFreeTrial ? 7 : 30;
  const todayStr = getUserTodayStr(dbUser.timezone);

  let currentDay = dbUser.currentDay || 1;

  // The rule, in one place: the learner moves on only when the day they were on
  // was completed on an EARLIER calendar date than today. Completing today's
  // work earns the next day but does not grant it immediately, so with the
  // window still open this finds nothing and returns the same day. If the
  // window closes with tasks outstanding, the same lookup also finds nothing —
  // the learner stays put and the missed-day penalty applies instead.
  //
  // Requiring the row to be dated exactly `wallet.lastCompletedDate` was
  // brittle: that field is also written by the deposit flow, so a legitimate
  // completion could fail to match and strand the learner on a finished day.
  const completedProgress = await prisma.userDailyProgress.findFirst({
    where: {
      userId,
      level: activeLevel,
      dayNumber: currentDay,
      examPassed: true,
      progressDate: { lt: todayStr },
    },
    orderBy: { progressDate: 'desc' },
  });
  if (!completedProgress) return currentDay;

  // At most one day per date rollover: several missed days do not fast-forward
  // the learner past modules they never sat.
  if (currentDay >= maxDay) return currentDay;

  currentDay += 1;
  await userRepository.updateUser(userId, { currentDay });
  return currentDay;
};
