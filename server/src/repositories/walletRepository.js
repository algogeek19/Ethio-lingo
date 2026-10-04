import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';
import { FREE_TRIAL_DAYS } from '../constants/curriculum.js';

/**
 * In-memory wallets, used ONLY when there is no database at all (local dev
 * without Postgres).
 *
 * This deliberately starts empty. It previously shipped hardcoded demo entries
 * for `usr_learner_001` and `usr_admin_001` carrying 900 and 2,700 ETB stakes,
 * and findWalletByUserId falls back to this map whenever a query fails. A
 * transient database error therefore served a fabricated balance — the exact
 * "the vault reset to its initial value" symptom — and did it silently, with no
 * way to tell it apart from real data. Better to fall back to nothing than to
 * invent someone's escrow balance.
 */
const MOCK_WALLETS = {};

export const createWalletForUser = async (userId, initialDeposit = 0.0, isFreeTrialOverride) => {
  const platformFee = 0.0;
  const netStake = initialDeposit > 0 ? initialDeposit - platformFee : 0.0;
  const isFreeTrial = isFreeTrialOverride !== undefined ? isFreeTrialOverride : initialDeposit <= 0;

  const newWallet = {
    id: `w-${Math.floor(1000 + Math.random() * 9000)}`,
    userId,
    stakedAmount: netStake,
    availableBalance: 0.0,
    totalPenalties: 0.0,
    totalPlatformFees: platformFee,
    platformFeePercent: 0.0,
    streakCount: 0,
    isFreeTrial,
    freeTrialStartDate: new Date(),
    freeTrialDaysLeft: FREE_TRIAL_DAYS,
  };

  MOCK_WALLETS[userId] = newWallet;

  return await safeDbQuery(
    () =>
      prisma.wallet.create({
        data: {
          userId,
          stakedAmount: netStake,
          totalPlatformFees: platformFee,
          isFreeTrial,
          freeTrialStartDate: new Date(),
          freeTrialDaysLeft: FREE_TRIAL_DAYS,
        },
      }),
    () => newWallet
  );
};

export const findWalletByUserId = async (userId) => {
  const dbWallet = await safeDbQuery(
    () => prisma.wallet.findUnique({ where: { userId } }),
    () => null
  );

  if (dbWallet) return dbWallet;
  if (MOCK_WALLETS[userId]) return MOCK_WALLETS[userId];

  // Derive isFreeTrial based on associated user status
  const dbUser = await safeDbQuery(
    () => prisma.user.findUnique({ where: { id: userId } }),
    () => null
  );
  const isTrial = dbUser ? dbUser.status !== 'PENDING_APPROVAL' && dbUser.status !== 'PENDING_DEPOSIT' : true;

  const autoWallet = {
    id: `w-auto-${userId}`,
    userId,
    stakedAmount: 0.0,
    availableBalance: 0.0,
    totalPenalties: 0.0,
    totalPlatformFees: 0.0,
    platformFeePercent: 0.0,
    streakCount: 0,
    isFreeTrial: isTrial,
    freeTrialStartDate: new Date(),
    freeTrialDaysLeft: FREE_TRIAL_DAYS,
  };
  MOCK_WALLETS[userId] = autoWallet;
  return autoWallet;
};

export const updateWallet = async (userId, updateData) => {
  return await safeDbQuery(
    () => prisma.wallet.update({ where: { userId }, data: updateData }),
    () => {
      const existing = MOCK_WALLETS[userId] || MOCK_WALLETS['usr_learner_001'];
      const updated = { ...existing, ...updateData };
      MOCK_WALLETS[userId] = updated;
      return updated;
    }
  );
};
