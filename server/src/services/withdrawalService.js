import * as withdrawalRepository from '../repositories/withdrawalRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as ledgerRepository from '../repositories/ledgerRepository.js';
import { AppError } from '../utils/AppError.js';

export const requestWithdrawal = async (userId, { levelCompleted, amount, bankName, accountNumber, telebirrNumber }) => {
  let user = userId ? await userRepository.findUserById(userId) : null;
  if (!user) {
    user = (await userRepository.findAllUsers())?.[0] || null;
  }

  const resolvedUserId = user?.id || userId || 'usr_learner_001';
  const userName = user?.name || 'Learner User';
  const userEmail = user?.email || 'learner@birrend.com';

  let wallet = user?.id ? await walletRepository.findWalletByUserId(user.id) : null;

  const parsedAmount = amount !== undefined && amount !== null && !isNaN(Number(amount)) && Number(amount) > 0
    ? Number(amount)
    : (wallet?.stakedAmount && wallet.stakedAmount > 0 ? wallet.stakedAmount : 900.0);

  const finalLevel = levelCompleted || user?.level || 'Beginner I';
  const finalBank = bankName || 'Commercial Bank of Ethiopia (CBE)';
  const finalAccount = accountNumber || '1000123456789';
  const finalTelebirr = telebirrNumber || '0911234567';

  const withdrawal = await withdrawalRepository.createWithdrawalRequest({
    userId: resolvedUserId,
    userName,
    userEmail,
    levelCompleted: finalLevel,
    amount: parsedAmount,
    bankName: finalBank,
    accountNumber: finalAccount,
    telebirrNumber: finalTelebirr,
  });

  await ledgerRepository.createLedgerEntry({
    userId: resolvedUserId,
    type: 'WITHDRAWAL_REQUEST',
    amount: parsedAmount,
    status: 'PENDING',
    description: `Level Completion Withdrawal Request (${finalLevel}) to ${finalBank} (${finalAccount})`,
  }).catch(() => null);

  // Deduct withdrawn amount from user's staked balance and upgrade level in database
  if (resolvedUserId) {
    const currentStaked = wallet?.stakedAmount || 900.0;
    const newStaked = Math.max(0, currentStaked - parsedAmount);
    await walletRepository.updateWallet(resolvedUserId, {
      stakedAmount: newStaked,
    }).catch(() => null);

    // Automatically upgrade level to next level in 6-level track for returning journey
    const LEVEL_TRACKS = [
      'Beginner I',
      'Beginner II',
      'Intermediate I',
      'Intermediate II',
      'Advanced I',
      'Advanced II',
    ];
    const currentLevel = user?.level || finalLevel || 'Beginner I';
    const currentIdx = LEVEL_TRACKS.indexOf(currentLevel);
    if (currentIdx !== -1 && currentIdx < LEVEL_TRACKS.length - 1) {
      const nextLevel = LEVEL_TRACKS[currentIdx + 1];
      await userRepository.updateUser(resolvedUserId, {
        level: nextLevel,
      }).catch(() => null);
    }
  }

  return withdrawal;
};

export const getUserWithdrawalRequests = async (userId) => {
  return await withdrawalRepository.findWithdrawalRequestsByUserId(userId);
};

export const getAllWithdrawalRequests = async () => {
  return await withdrawalRepository.findAllWithdrawalRequests();
};

export const processWithdrawalStatus = async (requestId, status) => {
  return await withdrawalRepository.updateWithdrawalStatus(requestId, status);
};
