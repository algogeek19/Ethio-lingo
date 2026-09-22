import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';

export const findBooksByLevel = async (level) => {
  return await prisma.levelBook.findMany({
    where: { level },
    orderBy: { createdAt: 'asc' },
  });
};

export const createLevelBook = async (bookData) => {
  return await prisma.levelBook.create({ data: bookData });
};

export const deleteLevelBook = async (id) => {
  return await prisma.levelBook.delete({ where: { id } });
};

export const findModuleByLevelAndDay = async (level, dayNumber) => {
  const parsedDay = parseInt(dayNumber, 10);
  const dbModule = await safeDbQuery(
    () => prisma.curriculumModule.findUnique({
      where: { level_dayNumber: { level, dayNumber: parsedDay } },
    }),
    () => null
  );

  if (dbModule) return { ...dbModule, isPopulated: true };

  // Default fallback module for Free Trial or main levels
  const isTrial = level === 'Free Trial';
  return {
    id: `mod-${level.replace(/\s+/g, '-').toLowerCase()}-${parsedDay}`,
    level,
    dayNumber: parsedDay,
    title: isTrial
      ? `Free Trial Day ${parsedDay}: Foundations of Academic English & Staking`
      : `${level} Module — Day ${parsedDay}: Essential Sentence Structure & Vocabulary`,
    lessonVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    refGuideTitle: isTrial
      ? `Free Trial Study Guide — Day ${parsedDay}`
      : `${level} Day ${parsedDay} Reference Manual`,
    refGuideDescription: isTrial
      ? `Welcome to Day ${parsedDay} of your 7-Day Free Trial! Focus on core grammar patterns and academic listening.`
      : `Comprehensive reference manual covering Day ${parsedDay} grammar structures and academic vocabulary.`,
    refGuideUrl: '',
    listeningInformativeUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    listeningEntertainmentUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    isPopulated: false,
  };
};

export const upsertCurriculumModule = async (moduleData) => {
  const parsedDay = parseInt(moduleData.dayNumber, 10);
  return await prisma.curriculumModule.upsert({
    where: { level_dayNumber: { level: moduleData.level, dayNumber: parsedDay } },
    update: moduleData,
    create: moduleData,
  });
};

export const findPopulatedModuleDaysByLevel = async (level) => {
  const modules = await safeDbQuery(
    () => prisma.curriculumModule.findMany({
      where: { level },
      select: { dayNumber: true },
    }),
    () => []
  );
  return (modules || []).map((m) => m.dayNumber);
};

