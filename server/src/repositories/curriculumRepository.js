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

// Verified-embeddable placeholders used whenever a day has no real material
// assigned yet. Must stay embeddable: the task player renders them through the
// YouTube IFrame API, which cannot play direct MP3/file URLs.
export const PLACEHOLDER_MATERIAL = {
  lessonVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  listeningInformativeUrl: 'https://www.youtube.com/watch?v=eIho2S0ZahI',
  listeningEntertainmentUrl: 'https://www.youtube.com/watch?v=H14bBuluwB8',
};

const isUsableMaterial = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export const findModuleByLevelAndDay = async (level, dayNumber) => {
  const parsedDay = parseInt(dayNumber, 10);
  const dbModule = await safeDbQuery(
    () => prisma.curriculumModule.findUnique({
      where: { level_dayNumber: { level, dayNumber: parsedDay } },
    }),
    () => null
  );

  const isTrial = level === 'Free Trial';
  const fallbackModule = {
    id: `mod-${level.replace(/\s+/g, '-').toLowerCase()}-${parsedDay}`,
    level,
    dayNumber: parsedDay,
    title: isTrial
      ? `Free Trial Day ${parsedDay}: Foundations of Academic English & Staking`
      : `${level} Module — Day ${parsedDay}: Essential Sentence Structure & Vocabulary`,
    refGuideTitle: isTrial
      ? `Free Trial Study Guide — Day ${parsedDay}`
      : `${level} Day ${parsedDay} Reference Manual`,
    refGuideDescription: isTrial
      ? `Welcome to Day ${parsedDay} of your 7-Day Free Trial! Focus on core grammar patterns and academic listening.`
      : `Comprehensive reference manual covering Day ${parsedDay} grammar structures and academic vocabulary.`,
    refGuideUrl: '',
    ...PLACEHOLDER_MATERIAL,
  };

  if (!dbModule) return { ...fallbackModule, isPopulated: false };

  // A row can exist while individual slots are still empty — an admin may have
  // uploaded the lesson and left the listening tracks for later. Returning it
  // verbatim would hand the player a null URL, so each missing slot is filled
  // from the placeholders and the day stays workable.
  const filled = { ...dbModule };
  for (const field of Object.keys(PLACEHOLDER_MATERIAL)) {
    if (!isUsableMaterial(filled[field])) filled[field] = PLACEHOLDER_MATERIAL[field];
  }

  return { ...filled, isPopulated: true };
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

