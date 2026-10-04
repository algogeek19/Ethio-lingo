import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';
import { getUserTodayStr } from '../utils/dateHelper.js';
import * as curriculumRepository from '../repositories/curriculumRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';
import { syncLearnerModuleDay } from './stakingService.js';

/**
 * Resolve the single canonical (level, day, date) triple that identifies a
 * learner's daily progress row.
 *
 * Both the read path (getDailyWorkspaceData) and the write path
 * (updateTaskCompletion) MUST go through here. They used to resolve the day
 * differently — the read followed the server's own currentDay while the write
 * trusted whatever day the client sent — so a completion could be written to a
 * row that nothing ever read back. That is exactly the reported symptom: finish
 * a task, leave, come back, and it reads as incomplete, with the completion
 * orphaned in a row for the wrong day.
 *
 * Centralising the resolution makes that class of bug structurally impossible
 * rather than something to remember in two places.
 *
 * `dayNumber` is only honoured for admins, who browse arbitrary modules and are
 * exempt from the day lock. For learners the server's currentDay always wins.
 */
export const resolveDailyTarget = async (userId, requestedLevel, requestedDay) => {
  const dbUser = await safeDbQuery(
    () => prisma.user.findUnique({ where: { id: userId } }),
    () => ({ id: userId, timezone: 'Africa/Addis_Ababa', currentDay: parseInt(requestedDay || 1, 10), level: requestedLevel || 'Beginner I' })
  );

  const todayStr = getUserTodayStr(dbUser?.timezone);
  const wallet = await walletRepository.findWalletByUserId(userId);
  const isAdmin = dbUser?.role === 'admin';
  const isFreeTrial = !isAdmin && wallet ? !!wallet.isFreeTrial : requestedLevel === 'Free Trial';

  const activeLevel = isAdmin
    ? (requestedLevel || 'Beginner I')
    : (isFreeTrial ? 'Free Trial' : (requestedLevel || dbUser?.level || 'Beginner I'));
  const maxDay = isFreeTrial ? 7 : 30;

  // Day progression is decided server-side before anything is read or written,
  // so both paths agree on which day is current.
  const currentDay = isAdmin
    ? Math.min(maxDay, Math.max(1, parseInt(requestedDay || 1, 10)))
    : await syncLearnerModuleDay(userId, requestedLevel, isFreeTrial);

  return {
    dbUser,
    wallet,
    todayStr,
    isAdmin,
    isFreeTrial,
    activeLevel,
    maxDay,
    currentDay,
  };
};

export const getDailyWorkspaceData = async (userId, level, dayNumber) => {
  const { wallet, todayStr, isFreeTrial, activeLevel, maxDay, currentDay } = await resolveDailyTarget(
    userId,
    level,
    dayNumber
  );

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
  // Same resolver as the read path, so a completion is always written to the
  // exact row getDailyWorkspaceData will later read. Previously this trusted
  // the client-supplied day while the read followed the server's currentDay,
  // which orphaned completions on a day nobody read — the task then looked
  // incomplete again on the next visit, with no way to recover it.
  const { todayStr, isFreeTrial, activeLevel, currentDay } = await resolveDailyTarget(userId, level, dayNumber);

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

    // Free Trial is a 7-day track (matching the 7 seeded modules).
    if (isFreeTrial && currentDay >= 7 && isExamPassed) {
      await walletRepository.updateWallet(userId, {
        freeTrialDaysLeft: 0,
      });
    }
  }

  return await progressRepository.upsertDailyProgress({
    userId,
    level: activeLevel,
    dayNumber: currentDay,
    progressDate: todayStr,
    updateData: updateFields,
  });
};
