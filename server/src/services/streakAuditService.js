import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';
import { getUserTodayStr, calendarDaysBetween } from '../utils/dateHelper.js';
import * as walletRepository from '../repositories/walletRepository.js';
import * as ledgerRepository from '../repositories/ledgerRepository.js';
import * as userRepository from '../repositories/userRepository.js';

/**
 * Production-Ready Date-Driven Catch-Up Audit Engine.
 * Operates with timezone security, double-penalty prevention via lastAuditedDate,
 * and complete separation of Free Trial vs Staked Escrow tracks.
 */
export const auditUserStreakAndPenalties = async (userId) => {
  if (!userId) return null;

  return await safeDbQuery(
    async () => {
      // 1. Fetch user and wallet
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || !dbUser) return null;

      const todayStr = getUserTodayStr(dbUser.timezone);

      // Track 1: Free Trial Track (0 penalties, 0 streak, 3 trial days max)
      if (wallet.isFreeTrial) {
        const currentModuleDay = dbUser.currentDay || 1;
        const daysRemaining = Math.max(0, 3 - (currentModuleDay - 1));

        if (daysRemaining <= 0 || currentModuleDay > 3) {
          return await walletRepository.updateWallet(userId, {
            freeTrialDaysLeft: 0,
            streakCount: 0,
            lastAuditedDate: todayStr,
          });
        } else {
          return await walletRepository.updateWallet(userId, {
            freeTrialDaysLeft: daysRemaining,
            streakCount: 0,
            lastAuditedDate: todayStr,
          });
        }
      }

      // Track 2: Staked Escrow Track
      if (wallet.lastAuditedDate === todayStr) {
        return wallet;
      }

      const completedDate = wallet.lastCompletedDate || null;
      const auditedDate = wallet.lastAuditedDate || null;

      // Select reference date: use auditedDate if it is strictly newer than completedDate
      let referenceDate = todayStr;
      let isCompletedReference = false;

      if (auditedDate && (!completedDate || auditedDate > completedDate)) {
        referenceDate = auditedDate;
        isCompletedReference = false;
      } else if (completedDate) {
        referenceDate = completedDate;
        isCompletedReference = true;
      }

      const diffDays = calendarDaysBetween(todayStr, referenceDate);

      let missedDaysCount = 0;
      if (isCompletedReference) {
        // If relative to last completed date, 1 day diff = active window (0 missed). >1 diff = (diff - 1) missed.
        if (diffDays > 1) {
          missedDaysCount = diffDays - 1;
        }
      } else {
        // If relative to previously penalized audit date, each 1 day diff = 1 missed day.
        if (diffDays >= 1) {
          missedDaysCount = diffDays;
        }
      }

      if (missedDaysCount <= 0) {
        if (wallet.lastAuditedDate !== todayStr && (completedDate === todayStr || !auditedDate)) {
          return await walletRepository.updateWallet(userId, { lastAuditedDate: todayStr });
        }
        return wallet;
      }

      const currentStake = wallet.stakedAmount || 0.0;
      const intendedPenalty = missedDaysCount * 80.0;
      const actualDeduction = Math.min(currentStake, intendedPenalty);
      const newStake = Math.max(0, currentStake - actualDeduction);

      const updatedWallet = await walletRepository.updateWallet(userId, {
        stakedAmount: newStake,
        totalPenalties: (wallet.totalPenalties || 0.0) + actualDeduction,
        streakCount: 0, // Reset streak count to 0 when daily window is missed
        lastAuditedDate: todayStr,
      });

      // Low balance lockout (< 100 ETB requirement)
      if (newStake < 100.0) {
        await userRepository.updateUser(userId, {
          isActive: false,
          status: 'PENDING_DEPOSIT',
        });
      }

      // Log 1 Ledger Transaction if penalty deducted
      if (actualDeduction > 0) {
        await ledgerRepository.createLedgerEntry({
          userId,
          type: 'PENALTY_DEDUCTION',
          amount: actualDeduction,
          status: 'PENALTY',
          description: `Missed ${missedDaysCount} daily window(s) penalty deduction (-${actualDeduction} ETB, streak reset to 0)`,
        });
      }

      return updatedWallet;
    },
    () => null
  );
};

