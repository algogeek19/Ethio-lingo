import { prisma } from '../config/database.js';

/**
 * Daily progress is the learner's record of what they actually completed, and
 * it drives the escrow/streak consequences, so it is the one thing that must
 * never be served from a fallback.
 *
 * This module previously degraded to an in-process MOCK_PROGRESS object
 * whenever a query threw. That made a database problem indistinguishable from
 * success: the write reported 200, the UI ticked the task as Done, and the
 * value vanished on the next request or on a second server instance. That is
 * precisely the reported "I finished a task, left, came back, and it was
 * incomplete again" — with the completion unrecoverable.
 *
 * Failures now propagate. `completeTask` on the client already rolls its
 * optimistic tick back when the write throws, so a real outage now shows the
 * learner the truth instead of quietly losing their work.
 */

const findRow = (userId, level, dayNumber, progressDate) =>
  prisma.userDailyProgress.findFirst({
    where: { userId, level, dayNumber, progressDate },
  });

export const findDailyProgress = async (userId, level, dayNumber, progressDate) => {
  const parsedDay = parseInt(dayNumber, 10);
  const targetDate = progressDate || new Date().toISOString().split('T')[0];

  // No fallback: an empty result means "no row for today", which is a normal,
  // meaningful answer and is handled by creating the row on first write.
  return await findRow(userId, level, parsedDay, targetDate);
};

export const upsertDailyProgress = async ({ userId, level, dayNumber, progressDate, updateData }) => {
  const parsedDay = parseInt(dayNumber, 10);
  const targetDate = progressDate || new Date().toISOString().split('T')[0];

  const existing = await findRow(userId, level, parsedDay, targetDate);

  if (existing) {
    // Only merge the flags being written. Spreading a full defaults object here
    // would clear task1/task2 when a later task completed.
    return await prisma.userDailyProgress.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  return await prisma.userDailyProgress.create({
    data: {
      userId,
      level,
      dayNumber: parsedDay,
      progressDate: targetDate,
      task1LessonCompleted: false,
      task2ListeningCompleted: false,
      examCompleted: false,
      examScore: 0,
      examPassed: false,
      ...updateData,
    },
  });
};