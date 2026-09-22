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

export const advanceUserStreak = async (userId) => {
  const wallet = await walletRepository.findWalletByUserId(userId);
  if (!wallet) return null;

  const newStreak = (wallet.streakCount || 0) + 1;
  const updated = await walletRepository.updateWallet(userId, {
    streakCount: newStreak,
  });

  return updated;
};
