import * as userRepository from '../repositories/userRepository.js';
import * as examRepository from '../repositories/examRepository.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { safeDbQuery } from '../utils/dbHelper.js';

export const validateQuestionBankJSON = (input) => {
  const questionsArray = Array.isArray(input)
    ? input
    : input && Array.isArray(input.questions)
    ? input.questions
    : null;

  if (!questionsArray || questionsArray.length === 0) {
    throw new AppError(
      'Validation Error: Question bank import must be a non-empty JSON array `[...]` or `{ "questions": [...] }`.',
      400
    );
  }

  questionsArray.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new AppError(`Validation Error at index [${index}]: Item must be a valid JSON object.`, 400);
    }

    const { question, options, level } = item;
    const answerIndex = parseInt(item.answerIndex ?? 0, 10);
    const dayNumber = parseInt(item.dayNumber ?? item.day ?? 1, 10);

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new AppError(`Validation Error at index [${index}]: Missing or invalid 'question' text string.`, 400);
    }

    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
      throw new AppError(`Validation Error at index [${index}]: 'options' must be an array with at least 2 choice strings.`, 400);
    }

    if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= parsedOptions.length) {
      throw new AppError(
        `Validation Error at index [${index}]: 'answerIndex' (${item.answerIndex}) is invalid or out of bounds for options length (${parsedOptions.length}).`,
        400
      );
    }

    if (!level || typeof level !== 'string') {
      throw new AppError(`Validation Error at index [${index}]: Missing or invalid 'level' string (e.g. 'Beginner I').`, 400);
    }

    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
      throw new AppError(`Validation Error at index [${index}]: 'dayNumber' (or 'day') must be an integer between 1 and 30.`, 400);
    }
  });

  return questionsArray;
};

export const getAdminAnalytics = async () => {
  const learnersCount = await prisma.user.count({ where: { role: 'learner' } });

  const walletAggr = await prisma.wallet.aggregate({
    _sum: {
      stakedAmount: true,
      totalPenalties: true,
      totalPlatformFees: true,
    },
    _avg: {
      streakCount: true,
    },
  });

  const totalStakedVault = walletAggr?._sum?.stakedAmount ?? 0;
  const totalPenaltiesSlashed = walletAggr?._sum?.totalPenalties ?? 0;
  const totalPlatformFees = walletAggr?._sum?.totalPlatformFees ?? 0;
  const avgStreak = walletAggr?._avg?.streakCount ? walletAggr._avg.streakCount.toFixed(1) : '0';

  // Calculate pass rate from UserDailyProgress records if available
  const totalExams = await prisma.userDailyProgress.count({ where: { examCompleted: true } });
  const passedExams = await prisma.userDailyProgress.count({ where: { examCompleted: true, examPassed: true } });
  const passRatePercent = totalExams > 0 ? parseFloat(((passedExams / totalExams) * 100).toFixed(1)) : 100;

  return {
    totalLearners: learnersCount,
    totalStakedVaultETB: totalStakedVault,
    totalPenaltiesSlashedETB: totalPenaltiesSlashed,
    totalPlatformFeesETB: totalPlatformFees,
    avgStreakCount: parseFloat(avgStreak),
    passRatePercent,
  };
};

export const getLearnerDirectory = async () => {
  const users = await userRepository.findAllUsers();
  return users
    .filter((u) => u.role === 'learner')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      level: u.level,
      currentDay: u.currentDay || 1,
      isActive: u.isActive,
      status: u.status,
      stakedAmount: u.wallet ? u.wallet.stakedAmount : 0,
      availableBalance: u.wallet ? u.wallet.availableBalance : 0,
      streakCount: u.wallet ? u.wallet.streakCount : 0,
      totalPenalties: u.wallet ? u.wallet.totalPenalties : 0,
      isFreeTrial: u.wallet ? u.wallet.isFreeTrial : false,
      freeTrialDaysLeft: u.wallet ? u.wallet.freeTrialDaysLeft : 0,
      createdAt: u.createdAt,
    }));
};

export const fetchLearnerFullDetails = async (userId) => {
  let user = await safeDbQuery(
    () =>
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
          dailyProgress: {
            orderBy: [{ dayNumber: 'desc' }, { progressDate: 'desc' }],
          },
          ledgerTransactions: {
            orderBy: { createdAt: 'desc' },
          },
          withdrawals: {
            orderBy: { requestedAt: 'desc' },
          },
        },
      }),
    async () => {
      const u = await userRepository.findUserById(userId);
      if (u) {
        return {
          ...u,
          dailyProgress: u.dailyProgress || [],
          ledgerTransactions: u.ledgerTransactions || [],
          withdrawals: u.withdrawals || [],
        };
      }
      return null;
    }
  );

  if (!user) {
    throw new AppError('Learner user not found', 404);
  }

  if (!user.dailyProgress) user.dailyProgress = [];
  if (!user.ledgerTransactions) user.ledgerTransactions = [];
  if (!user.withdrawals) user.withdrawals = [];

  return user;
};

export const updateLearnerProfile = async (userId, updateData) => {
  const {
    name,
    level,
    currentDay,
    status,
    isActive,
    streakCount,
    isFreeTrial,
    freeTrialDaysLeft,
  } = updateData;

  const userData = {};
  if (name !== undefined) userData.name = name;
  if (level !== undefined) userData.level = level;
  if (currentDay !== undefined) userData.currentDay = Math.min(30, Math.max(1, parseInt(currentDay, 10)));
  if (status !== undefined) {
    userData.status = status;
    if (status === 'SUSPENDED' || status === 'INACTIVE') {
      userData.isActive = false;
    } else if (status === 'ACTIVE') {
      userData.isActive = true;
    }
  }
  if (isActive !== undefined) userData.isActive = Boolean(isActive);

  const updatedUser = await safeDbQuery(
    () =>
      prisma.user.update({
        where: { id: userId },
        data: userData,
        include: { wallet: true },
      }),
    () => null
  );

  // Update wallet-specific properties if provided
  const walletData = {};
  if (streakCount !== undefined) walletData.streakCount = Math.max(0, parseInt(streakCount, 10));
  if (isFreeTrial !== undefined) walletData.isFreeTrial = Boolean(isFreeTrial);
  if (freeTrialDaysLeft !== undefined) walletData.freeTrialDaysLeft = Math.max(0, parseInt(freeTrialDaysLeft, 10));

  if (Object.keys(walletData).length > 0) {
    await safeDbQuery(
      () =>
        prisma.wallet.upsert({
          where: { userId },
          update: walletData,
          create: {
            userId,
            ...walletData,
          },
        }),
      () => null
    );
  }

  return await fetchLearnerFullDetails(userId);
};

export const adjustLearnerWalletBalance = async (userId, { balanceType = 'stakedAmount', amount, reason }) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount === 0) {
    throw new AppError('Adjustment amount must be a non-zero number.', 400);
  }

  const wallet = await safeDbQuery(
    () => prisma.wallet.findUnique({ where: { userId } }),
    () => null
  );

  if (!wallet) {
    throw new AppError('Wallet not found for this user.', 404);
  }

  const currentVal = balanceType === 'availableBalance' ? wallet.availableBalance : wallet.stakedAmount;
  const newVal = Math.max(0, currentVal + numAmount);

  const updatedWallet = await safeDbQuery(
    () =>
      prisma.wallet.update({
        where: { userId },
        data: {
          [balanceType === 'availableBalance' ? 'availableBalance' : 'stakedAmount']: newVal,
        },
      }),
    () => null
  );

  const actionText = numAmount >= 0 ? `+${numAmount} ETB added` : `${numAmount} ETB deducted`;
  const defaultReason = `Admin manual balance adjustment (${balanceType === 'availableBalance' ? 'Available Balance' : 'Staked Vault'}: ${actionText})`;

  await safeDbQuery(
    () =>
      prisma.ledgerTransaction.create({
        data: {
          userId,
          type: 'ADMIN_ADJUSTMENT',
          amount: Math.abs(numAmount),
          status: numAmount >= 0 ? 'SUCCESS' : 'PENALTY',
          description: reason ? `${reason} (${actionText})` : defaultReason,
        },
      }),
    () => null
  );

  return { wallet: updatedWallet, adjustedAmount: numAmount, balanceType };
};

export const importQuestionBankArray = async (input) => {
  // Validate JSON array structure and extract normalized array
  const questionsArray = validateQuestionBankJSON(input);

  return await examRepository.bulkInsertQuestions(questionsArray);
};

export const getExamAnalytics = async () => {
  const records = await prisma.userDailyProgress.findMany({
    include: { user: { select: { id: true, name: true, email: true, level: true } } },
    orderBy: { progressDate: 'desc' },
    take: 500,
  });

  const byLevel = {};
  let totalAttempts = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  (records || []).forEach((r) => {
    if (!byLevel[r.level]) {
      byLevel[r.level] = { level: r.level, attempts: 0, passed: 0, failed: 0, scoreSum: 0, count: 0 };
    }
    const bucket = byLevel[r.level];
    bucket.attempts += 1;
    totalAttempts += 1;
    if (r.examPassed) {
      bucket.passed += 1;
      totalPassed += 1;
    } else {
      bucket.failed += 1;
      totalFailed += 1;
    }
    if (typeof r.examScore === 'number') {
      bucket.scoreSum += r.examScore;
      bucket.count += 1;
      scoreSum += r.examScore;
      scoreCount += 1;
    }
  });

  const levelBreakdown = Object.values(byLevel).map((b) => ({
    ...b,
    avgScore: b.count > 0 ? parseFloat((b.scoreSum / b.count).toFixed(2)) : 0,
    passRatePercent: b.attempts > 0 ? parseFloat(((b.passed / b.attempts) * 100).toFixed(1)) : 0,
  }));

  const totalExamsRecorded = await prisma.userDailyProgress.count({ where: { examAttempts: { gt: 0 } } });
  const totalWithExamCompleted = await prisma.userDailyProgress.count({ where: { examCompleted: true } });

  return {
    overall: {
      totalAttempts,
      totalPassed,
      totalFailed,
      passRatePercent: totalAttempts > 0 ? parseFloat(((totalPassed / totalAttempts) * 100).toFixed(1)) : 0,
      avgScore: scoreCount > 0 ? parseFloat((scoreSum / scoreCount).toFixed(2)) : 0,
      totalExamsRecorded,
      totalWithExamCompleted,
    },
    byLevel: levelBreakdown,
  };
};

export const getFinancialOverview = async () => {
  const walletAggr = await prisma.wallet.aggregate({
    _sum: {
      stakedAmount: true,
      availableBalance: true,
      totalPenalties: true,
      totalPlatformFees: true,
    },
    _avg: { streakCount: true },
  });

  const freeTrialUsers = await prisma.wallet.count({ where: { isFreeTrial: true } });
  const stakedUsers = await prisma.wallet.count({ where: { stakedAmount: { gt: 0 } } });
  const activeLearners = await prisma.user.count({ where: { role: 'learner', isActive: true } });
  const bannedLearners = await prisma.user.count({ where: { role: 'learner', isBanned: true } });

  const depositAggr = await prisma.depositRequest.groupBy({
    by: ['status'],
    _sum: { amount: true },
    _count: { _all: true },
  });

  const withdrawalAggr = await prisma.withdrawalRequest.groupBy({
    by: ['status'],
    _sum: { amount: true },
    _count: { _all: true },
  });

  const depositsByStatus = (depositAggr || []).map((row) => ({
    status: row.status,
    totalAmountETB: row._sum?.amount ?? 0,
    count: row._count?._all ?? 0,
  }));
  const withdrawalsByStatus = (withdrawalAggr || []).map((row) => ({
    status: row.status,
    totalAmountETB: row._sum?.amount ?? 0,
    count: row._count?._all ?? 0,
  }));

  return {
    vault: {
      totalStakedETB: walletAggr?._sum?.stakedAmount ?? 0,
      totalAvailableETB: walletAggr?._sum?.availableBalance ?? 0,
      totalPenaltiesCollectedETB: walletAggr?._sum?.totalPenalties ?? 0,
      totalPlatformFeesETB: walletAggr?._sum?.totalPlatformFees ?? 0,
      avgStreakCount: walletAggr?._avg?.streakCount ? parseFloat(walletAggr._avg.streakCount.toFixed(1)) : 0,
    },
    users: {
      activeLearners,
      stakedUsers,
      freeTrialUsers,
      bannedLearners,
    },
    deposits: depositsByStatus,
    withdrawals: withdrawalsByStatus,
  };
};

export const getReportedMessages = async (status = null) => {
  const where = {};
  if (status) where.status = status;
  return await prisma.chatReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      reporterUser: { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true, level: true, isBanned: true } },
    },
  });
};

export const resolveChatReport = async (reportId, status, banReportedUser = false) => {
  const allowed = ['open', 'resolved', 'dismissed'];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid report status. Allowed: ${allowed.join(', ')}`, 400);
  }

  const report = await prisma.chatReport.findUnique({ where: { id: reportId } });
  if (!report) {
    throw new AppError('Chat report not found.', 404);
  }

  const updated = await prisma.chatReport.update({
    where: { id: reportId },
    data: { status },
  });

  if (status === 'resolved' && banReportedUser && report.reportedUserId) {
    await prisma.user.update({
      where: { id: report.reportedUserId },
      data: { isBanned: true, isActive: false, status: 'SUSPENDED' },
    });
  }

  return updated;
};

export const setUserBanStatus = async (userId, isBanned) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError('Learner user not found', 404);
  }
  return await userRepository.updateUser(userId, {
    isBanned: Boolean(isBanned),
    isActive: !isBanned,
    status: isBanned ? 'SUSPENDED' : 'ACTIVE',
  });
};
