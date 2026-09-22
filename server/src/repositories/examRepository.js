import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';

const MOCK_QUESTIONS_POOL = {};

export const findQuestionsByLevelAndDay = async (level, dayNumber) => {
  const targetLevel = level || 'Beginner I';
  const parsedDay = parseInt(dayNumber, 10);
  const key = `${targetLevel.toLowerCase()}_${parsedDay}`;

  return await safeDbQuery(
    () =>
      prisma.questionBank.findMany({
        where: {
          OR: [
            { level: targetLevel, dayNumber: parsedDay },
            { level: { equals: targetLevel, mode: 'insensitive' }, dayNumber: parsedDay },
          ],
        },
      }),
    () => MOCK_QUESTIONS_POOL[key] || []
  );
};

export const getRandomExamQuestions = async (level, dayNumber, count = 20) => {
  const allQuestions = await findQuestionsByLevelAndDay(level, dayNumber);

  if (!allQuestions || allQuestions.length === 0) {
    const isTrial = level === 'Free Trial';
    return Array.from({ length: count }, (_, i) => ({
      id: `q-${level.toLowerCase()}-${dayNumber}-${i + 1}`,
      question: isTrial
        ? `Free Trial Day ${dayNumber} Question ${i + 1}: Select the correct sentence structure.`
        : `${level} Day ${dayNumber} Exam Q${i + 1}: Choose the grammatically correct option.`,
      options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
      answerIndex: 0,
    }));
  }

  const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const formatKeywords = (kw) => {
  if (Array.isArray(kw)) return JSON.stringify(kw);
  if (typeof kw === 'string') {
    try {
      const parsed = JSON.parse(kw);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch (e) {}
    return JSON.stringify(kw.split(',').map((k) => k.trim()).filter(Boolean));
  }
  return JSON.stringify([]);
};

export const bulkInsertQuestions = async (questionsArray) => {
  return await safeDbQuery(
    async () => {
      const createPromises = questionsArray.map((q) => {
        const parsedDay = parseInt(q.dayNumber ?? q.day ?? 1, 10);
        const level = (q.level || 'Beginner I').trim();
        const optionsStr = typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []);
        const answerIdx = parseInt(q.answerIndex ?? 0, 10);

        return prisma.questionBank.create({
          data: {
            level,
            dayNumber: parsedDay,
            question: q.question,
            options: optionsStr,
            answerIndex: isNaN(answerIdx) ? 0 : answerIdx,
            keywords: formatKeywords(q.keywords),
          },
        });
      });
      const results = await prisma.$transaction(createPromises);
      return results.length;
    },
    () => {
      questionsArray.forEach((q) => {
        const normLevel = (q.level || 'Beginner I').trim();
        const parsedDay = parseInt(q.dayNumber ?? q.day ?? 1, 10);
        const key = `${normLevel.toLowerCase()}_${parsedDay}`;

        if (!MOCK_QUESTIONS_POOL[key]) MOCK_QUESTIONS_POOL[key] = [];
        MOCK_QUESTIONS_POOL[key].push({
          id: `q-${Math.floor(1000 + Math.random() * 9000)}`,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []),
          answerIndex: parseInt(q.answerIndex ?? 0, 10),
        });
      });
      return questionsArray.length;
    }
  );
};

