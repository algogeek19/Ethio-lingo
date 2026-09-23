import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';
import { getUserTodayStr } from '../utils/dateHelper.js';
import * as curriculumRepository from '../repositories/curriculumRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';

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
  const parsedDay = isFreeTrial
    ? Math.min(7, Math.max(1, parseInt(dayNumber || 1, 10)))
    : Math.min(30, Math.max(1, parseInt(dayNumber || 1, 10)));

  const moduleData = await curriculumRepository.findModuleByLevelAndDay(activeLevel, parsedDay);
  let progress = await progressRepository.findDailyProgress(userId, activeLevel, parsedDay, todayStr);

  // Automatic day advance on new calendar date:
  let currentDay = dbUser?.currentDay || 1;
  if (wallet?.lastCompletedDate && wallet.lastCompletedDate < todayStr && userId) {
    const prevProgress = await progressRepository.findDailyProgress(userId, activeLevel, currentDay, wallet.lastCompletedDate);
    if (prevProgress && prevProgress.examPassed) {
      const maxDay = isFreeTrial ? 7 : 30;
      if (currentDay < maxDay) {
        currentDay += 1;
        await safeDbQuery(
          () => prisma.user.update({ where: { id: userId }, data: { currentDay } }),
          () => {}
        );
      }
    }
  }

  // Strict 1 Module per Calendar Day Lock Check:
  // If user already completed a module today (lastCompletedDate === todayStr) and is requesting next day, lock it!
  const isLockedForToday = wallet?.lastCompletedDate === todayStr && parsedDay > currentDay;

  // If no database row exists for this user/level/day, automatically create one now!
  if (!progress) {
    progress = await progressRepository.upsertDailyProgress({
      userId,
      level: activeLevel,
      dayNumber: parsedDay,
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
  const todayStr = new Date().toISOString().split('T')[0];
  const wallet = await walletRepository.findWalletByUserId(userId);
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
