import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';

const MOCK_USERS_DB = {};

export const findUserByEmail = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  let user = await safeDbQuery(
    () => prisma.user.findUnique({ where: { email: cleanEmail }, include: { wallet: true } }),
    () => MOCK_USERS_DB[cleanEmail] || null
  );

  if (user && user.role === 'learner' && !user.wallet) {
    const isTrial = user.status !== 'PENDING_APPROVAL' && user.status !== 'PENDING_DEPOSIT';
    const newWallet = await safeDbQuery(
      () =>
        prisma.wallet.create({
          data: {
            userId: user.id,
            stakedAmount: 0.0,
            availableBalance: 0.0,
            totalPenalties: 0.0,
            totalPlatformFees: 0.0,
            isFreeTrial: isTrial,
            freeTrialStartDate: new Date(),
            freeTrialDaysLeft: 3,
          },
        }),
      () => null
    );
    if (newWallet) user.wallet = newWallet;
  }

  return user;
};

export const findUserById = async (id) => {
  let user = await safeDbQuery(
    () => prisma.user.findUnique({ where: { id }, include: { wallet: true } }),
    () => Object.values(MOCK_USERS_DB).find((u) => u.id === id) || null
  );

  if (user && user.role === 'learner' && !user.wallet) {
    const isTrial = user.status !== 'PENDING_APPROVAL' && user.status !== 'PENDING_DEPOSIT';
    const newWallet = await safeDbQuery(
      () =>
        prisma.wallet.create({
          data: {
            userId: user.id,
            stakedAmount: 0.0,
            availableBalance: 0.0,
            totalPenalties: 0.0,
            totalPlatformFees: 0.0,
            isFreeTrial: isTrial,
            freeTrialStartDate: new Date(),
            freeTrialDaysLeft: 3,
          },
        }),
      () => null
    );
    if (newWallet) user.wallet = newWallet;
  }

  return user;
};

export const createUser = async (userData) => {
  const cleanEmail = userData.email.toLowerCase().trim();
  const isLearner = (userData.role || 'learner') === 'learner';
  const isTrial = userData.status !== 'PENDING_APPROVAL' && userData.status !== 'PENDING_DEPOSIT';

  const defaultMockWallet = {
    id: `w-${Math.floor(1000 + Math.random() * 9000)}`,
    stakedAmount: 0.0,
    availableBalance: 0.0,
    totalPenalties: 0.0,
    totalPlatformFees: 0.0,
    platformFeePercent: 0.0,
    streakCount: 0,
    isFreeTrial: isTrial,
    freeTrialStartDate: new Date(),
    freeTrialDaysLeft: 3,
  };

  const newUser = {
    id: `usr_${Math.floor(1000 + Math.random() * 9000)}`,
    email: cleanEmail,
    name: userData.name,
    role: userData.role || 'learner',
    level: userData.level || 'Beginner I',
    currentDay: userData.currentDay || 1,
    isActive: userData.isActive !== undefined ? userData.isActive : isTrial,
    status: userData.status || (isTrial ? 'ACTIVE' : 'PENDING_APPROVAL'),
    createdAt: new Date(),
    wallet: isLearner ? defaultMockWallet : null,
  };

  const prismaCreateData = {
    ...userData,
    email: cleanEmail,
  };

  if (isLearner && !prismaCreateData.wallet) {
    prismaCreateData.wallet = {
      create: {
        stakedAmount: 0.0,
        availableBalance: 0.0,
        totalPenalties: 0.0,
        totalPlatformFees: 0.0,
        isFreeTrial: isTrial,
        freeTrialStartDate: new Date(),
        freeTrialDaysLeft: 3,
      },
    };
  }

  return await safeDbQuery(
    () => prisma.user.create({ data: prismaCreateData, include: { wallet: true } }),
    () => {
      MOCK_USERS_DB[cleanEmail] = newUser;
      return newUser;
    }
  );
};

export const updateUser = async (id, updateData) => {
  const dbData = { ...updateData };
  if (dbData.avatar && !dbData.image) {
    dbData.image = dbData.avatar;
  }
  return await safeDbQuery(
    () => prisma.user.update({ where: { id }, data: dbData }),
    () => {
      const user = Object.values(MOCK_USERS_DB).find((u) => u.id === id);
      if (user) {
        Object.assign(user, dbData);
        if (dbData.image) {
          user.image = dbData.image;
          user.avatar = dbData.image;
        }
        return user;
      }
      return null;
    }
  );
};

export const findAllUsers = async () => {
  return await safeDbQuery(
    () => prisma.user.findMany({ include: { wallet: true }, orderBy: { createdAt: 'desc' } }),
    () => Object.values(MOCK_USERS_DB)
  );
};
