import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';

const MOCK_WITHDRAWALS = [
  {
    id: 'wdr-101',
    userId: 'usr_learner_001',
    userName: 'Abebe Kebede',
    userEmail: 'learner@birrend.com',
    levelCompleted: 'Beginner I',
    amount: 900.0,
    bankName: 'Commercial Bank of Ethiopia',
    accountNumber: '1000123456789',
    telebirrNumber: '0911234567',
    status: 'pending',
    requestedAt: new Date(),
  },
];

export const createWithdrawalRequest = async (data) => {
  const newReq = {
    id: `wdr-${Math.floor(1000 + Math.random() * 9000)}`,
    ...data,
    status: 'pending',
    requestedAt: new Date(),
  };

  return await safeDbQuery(
    () => prisma.withdrawalRequest.create({ data }),
    () => {
      MOCK_WITHDRAWALS.unshift(newReq);
      return newReq;
    }
  );
};

export const findWithdrawalRequestsByUserId = async (userId) => {
  return await safeDbQuery(
    () => prisma.withdrawalRequest.findMany({ where: { userId }, orderBy: { requestedAt: 'desc' } }),
    () => MOCK_WITHDRAWALS.filter((w) => w.userId === userId)
  );
};

export const findAllWithdrawalRequests = async () => {
  return await safeDbQuery(
    () => prisma.withdrawalRequest.findMany({ orderBy: { requestedAt: 'desc' } }),
    () => MOCK_WITHDRAWALS
  );
};

export const updateWithdrawalStatus = async (id, status) => {
  return await safeDbQuery(
    () => prisma.withdrawalRequest.update({ where: { id }, data: { status, processedAt: new Date() } }),
    () => {
      const target = MOCK_WITHDRAWALS.find((w) => w.id === id);
      if (target) {
        target.status = status;
        target.processedAt = new Date();
        return target;
      }
      return { id, status };
    }
  );
};
