import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';

const MOCK_PROGRESS = {};

export const findDailyProgress = async (userId, level, dayNumber, progressDate) => {
  const parsedDay = parseInt(dayNumber, 10);
  const targetDate = progressDate || new Date().toISOString().split('T')[0];
  const key = `${userId}_${level}_${parsedDay}_${targetDate}`;

  const dbRecord = await safeDbQuery(
    async () => {
      // 1. Strict lookup for exact user, level, dayNumber AND progressDate
      const rec = await prisma.userDailyProgress.findFirst({
        where: { userId, level, dayNumber: parsedDay, progressDate: targetDate },
      });
      return rec;
    },
    () => null
  );

  return dbRecord || MOCK_PROGRESS[key] || null;
};

export const upsertDailyProgress = async ({ userId, level, dayNumber, progressDate, updateData }) => {
  const parsedDay = parseInt(dayNumber, 10);
  const targetDate = progressDate || new Date().toISOString().split('T')[0];
  const key = `${userId}_${level}_${parsedDay}_${targetDate}`;

  return await safeDbQuery(
    async () => {
      const existing = await prisma.userDailyProgress.findFirst({
        where: { userId, level, dayNumber: parsedDay, progressDate: targetDate },
      });

      if (existing) {
        return await prisma.userDailyProgress.update({ where: { id: existing.id }, data: updateData });
      }

      // Create fresh progress record for today with all task completion default flags as false
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
    },
    () => {
      const existing = MOCK_PROGRESS[key] || {
        id: `prg-${Math.floor(100 + Math.random() * 900)}`,
        userId,
        level,
        dayNumber: parsedDay,
        progressDate: targetDate,
        task1LessonCompleted: false,
        task2ListeningCompleted: false,
        examCompleted: false,
        examScore: 0,
        examPassed: false,
      };

      const updated = { ...existing, ...updateData };
      MOCK_PROGRESS[key] = updated;
      return updated;
    }
  );
};
