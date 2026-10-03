import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';
import { getUserTodayStr } from '../utils/dateHelper.js';
import * as curriculumRepository from '../repositories/curriculumRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';
import { syncLearnerModuleDay } from './stakingService.js';

export const getDailyWorkspaceData = async (userId, level, dayNumber) => {
  const dbUser = await safeDbQuery(
    () => prisma.user.findUnique({ where: { id: userId } }),
    () => ({ id: userId, timezone: 'Africa/Addis_Ababa', currentDay: parseInt(dayNumber || 1, 10), level: level || 'Beginner I' })
  );
  const todayStr = getUserTodayStr(dbUser?.timezone);

  const wallet = await walletRepository.findWalletByUserId(userId);
  const isAdmin = dbUser?.role === 'admin';
  const isFreeTrial = !isAdmin && wallet ? !!wallet.isFreeTrial : (level === 'Free Trial');
  const activeLevel = isAdmin
    ? (level || 'Beginner I')
    : (isFreeTrial ? 'Free Trial' : (level || dbUser?.level || 'Beginner I'));
  const maxDay = isFreeTrial ? 7 : 30;

  // Day progression is decided server-side before anything is read, so the
  // module that comes back always belongs to the day the learner is actually
  // entitled to. Doing this after the fetch handed back the previous day's
  // videos with the next day's progress row.
  const currentDay = isAdmin
    ? Math.min(maxDay, Math.max(1, parseInt(dayNumber || 1, 10)))
    : await syncLearnerModuleDay(userId, level, isFreeTrial);

  // Strict 1 Module per Calendar Day Lock Check:
  // If user already completed a module today (lastCompletedDate === todayStr) and is requesting next day, lock it!
  const isLockedForToday = wallet?.lastCompletedDate === todayStr && currentDay < maxDay;

  const moduleData = await curriculumRepository.findModuleByLevelAndDay(activeLevel, currentDay);
  let progress = await progressRepository.findDailyProgress(userId, activeLevel, currentDay, todayStr);

  // If no database row exists for this user/level/day, automatically create one now!
  if (!progress) {
    progress = await progressRepository.upsertDailyProgress({
      userId,
      level: activeLevel,
      dayNumber: currentDay,
      progressDate: todayStr,
      updateData: {
        task1LessonCompleted: false,
        task2ListeningCompleted: false,
        examCompleted: false,
        examScore: 0,
        examPassed: false,
      },
    });
  }

  return {
    module: moduleData,
    // The day the returned module/progress actually belongs to. The client
    // adopts this so its local day can never drift from the server's.
    currentDay,
    isLockedForToday,
    progress: progress || {
      task1LessonCompleted: false,
      task2ListeningCompleted: false,
      examCompleted: false,
      examScore: 0,
      examPassed: false,
    },
  };
};

export const updateTaskCompletion = async (userId, level, dayNumber, taskType, extraData = {}) => {
  const wallet = await walletRepository.findWalletByUserId(userId);
  // Must match the date used when *reading* progress in
  // getDailyWorkspaceData, or a task completed late in the evening is written
  // under one date and read back under another, so it silently reverts to
  // "not done" on the next fetch. That read path uses the user's timezone.
  const dbUser = await safeDbQuery(
    () => prisma.user.findUnique({ where: { id: userId } }),
    () => null
  );
  const todayStr = getUserTodayStr(dbUser?.timezone);
  const isFreeTrial = wallet ? !!wallet.isFreeTrial : false;
  const activeLevel = isFreeTrial ? 'Free Trial' : (level || 'Beginner I');
  const parsedDay = parseInt(dayNumber, 10);

  const updateFields = {};
  if (taskType === 'task1' || taskType === 'lesson') {
    updateFields.task1LessonCompleted = true;
  }
  if (taskType === 'task2' || taskType === 'video') {
    updateFields.task2ListeningCompleted = true;
  }
  if (taskType === 'exam') {
    const isExamPassed = extraData.passed === true || extraData.examPassed === true;
    updateFields.examCompleted = true;
    if (extraData.score !== undefined) updateFields.examScore = extraData.score;
    if (extraData.passed !== undefined) updateFields.examPassed = extraData.passed;

    // Immediately set freeTrialDaysLeft to 0 when Day 3 exam of Free Trial is completed!
    if (isFreeTrial && parsedDay >= 3 && isExamPassed) {
      await walletRepository.updateWallet(userId, {
        freeTrialDaysLeft: 0,
      });
    }
  }

  return await progressRepository.upsertDailyProgress({
    userId,
    level: activeLevel,
    dayNumber: parsedDay,
    progressDate: todayStr,
    updateData: updateFields,
  });
};
