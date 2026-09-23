import * as examRepository from '../repositories/examRepository.js';
import * as progressRepository from '../repositories/progressRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as stakingService from './stakingService.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../config/database.js';
import { getUserTodayStr } from '../utils/dateHelper.js';

const LEVEL_TRACKS = [
  'Beginner I',
  'Beginner II',
  'Intermediate I',
  'Intermediate II',
  'Advanced I',
  'Advanced II',
];

// Level-Based Passing Criteria:
// Beginner I & Beginner II -> 15/20 (75%)
// Intermediate & Advanced    -> 13/20 (65%)
// Adaptive rule: after 3+ prior attempts the bar drops to 10/20 (50%)
export const getExamPassThreshold = (level, priorAttempts = 0) => {
  if ((priorAttempts || 0) >= 3) return 10;
  const beginnerLevels = ['Beginner I', 'Beginner II'];
  if (beginnerLevels.includes(level)) return 15;
  return 13; // Intermediate & Advanced
};

export const getDailyExamQuestions = async (userId, level, dayNumber) => {
  const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const todayStr = getUserTodayStr(dbUser?.timezone);
  const wallet = userId ? await walletRepository.findWalletByUserId(userId) : null;
  const isFreeTrial = wallet ? !!wallet.isFreeTrial : false;
  const activeLevel = isFreeTrial ? 'Free Trial' : (level || 'Beginner I');

  // 1. Strict Exam Lock Guard: Verify both video tasks are complete for today
  if (userId) {
    const progress = await progressRepository.findDailyProgress(userId, activeLevel, parseInt(dayNumber, 10), todayStr);
    const isTask1Done = progress && progress.task1LessonCompleted;
    const isTask2Done = progress && progress.task2ListeningCompleted;

    if (!isTask1Done || !isTask2Done) {
      throw new AppError(
        'Forbidden: Daily Exam is locked. You must complete both workspace tasks (Lesson Video and Listening Skill) before taking the exam.',
        403
      );
    }
  }

  // 2. Randomly select 20 questions from the question bank for this level & module
  const questions = await examRepository.getRandomExamQuestions(activeLevel, parseInt(dayNumber, 10), 20);

  // Answer keys are NEVER sent to the client. Grading + mistake review happen server-side.
  return (questions || []).map((q) => ({
    id: q.id,
    question: q.question,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
  }));
};

const buildMistakeReview = (questions, answers, questionMap) => {
  const review = [];
  if (!Array.isArray(answers)) return review;

  answers.forEach((ans) => {
    const target = ans && ans.questionId ? questionMap.get(ans.questionId) : null;
    if (!target) return;
    const userChoice =
      typeof ans.selectedOption === 'number'
        ? ans.selectedOption
        : parseInt(ans.selectedOption || -1, 10);
    const isCorrect = userChoice === target.answerIndex;
    if (!isCorrect) {
      const options = typeof target.options === 'string' ? JSON.parse(target.options) : target.options;
      review.push({
        questionId: target.id,
        question: target.question,
        options,
        yourAnswerIndex: userChoice,
        yourAnswer: userChoice >= 0 ? options[userChoice] : '(Not answered)',
        correctAnswerIndex: target.answerIndex,
        correctAnswer: options[target.answerIndex] || '',
        explanation: target.explanation || '',
        isCorrect,
      });
    }
  });

  return review;
};

// Full per-question record of every answered question (correct AND incorrect) — powers the exam review page.
const buildFullAttemptRecord = (questions, answers, questionMap) => {
  const record = [];
  if (!Array.isArray(answers)) return record;

  answers.forEach((ans) => {
    const target = ans && ans.questionId ? questionMap.get(ans.questionId) : null;
    if (!target) return;
    const userChoice =
      typeof ans.selectedOption === 'number'
        ? ans.selectedOption
        : parseInt(ans.selectedOption || -1, 10);
    const isCorrect = userChoice === target.answerIndex;
    const options = typeof target.options === 'string' ? JSON.parse(target.options) : target.options;

    record.push({
      questionId: target.id,
      question: target.question,
      options,
      yourAnswerIndex: userChoice,
      yourAnswer: userChoice >= 0 ? options[userChoice] : '(Not answered)',
      correctAnswerIndex: target.answerIndex,
      correctAnswer: options[target.answerIndex] || '',
      explanation: target.explanation || '',
      isCorrect,
    });
  });

  return record;
};

export const submitExamAnswers = async (userId, level, dayNumber, answers) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const todayStr = getUserTodayStr(dbUser?.timezone);
  const parsedDay = parseInt(dayNumber, 10);

  // Extract question IDs for direct DB query
  const questionIds = Array.isArray(answers) ? answers.map((a) => a.questionId).filter(Boolean) : [];
  let allQuestions = [];
  if (questionIds.length > 0) {
    allQuestions = await prisma.questionBank.findMany({
      where: { id: { in: questionIds } },
    });
  }
  if (!allQuestions || allQuestions.length === 0) {
    allQuestions = await examRepository.findQuestionsByLevelAndDay(level, parsedDay);
  }

  const questionMap = new Map();
  (allQuestions || []).forEach((q) => {
    questionMap.set(q.id, q);
  });

  let score = 0;
  if (Array.isArray(answers)) {
    answers.forEach((ans, idx) => {
      let target = null;
      let userChoice = 0;

      if (typeof ans === 'object' && ans !== null && ans.questionId) {
        target = questionMap.get(ans.questionId);
        userChoice = typeof ans.selectedOption === 'number' ? ans.selectedOption : parseInt(ans.selectedOption || 0, 10);
      } else {
        userChoice = typeof ans === 'number' ? ans : parseInt(ans?.selectedOption || 0, 10);
        if (allQuestions && allQuestions[idx]) {
          target = allQuestions[idx];
        }
      }

      if (target && parseInt(userChoice, 10) === parseInt(target.answerIndex, 10)) {
        score++;
      }
    });
  }

  const totalQuestions = Array.isArray(answers) && answers.length > 0 ? answers.length : 20;

  // Locate prior attempts for today to drive the adaptive threshold
  const priorProgress = await progressRepository.findDailyProgress(userId, level, parsedDay, todayStr);
  const priorAttempts = (priorProgress && priorProgress.examAttempts) || 0;
  const passThreshold = getExamPassThreshold(level, priorAttempts);
  const passed = score >= passThreshold;

  const wallet = await walletRepository.findWalletByUserId(userId);
  const isFreeTrial = wallet ? !!wallet.isFreeTrial : false;

  let updatedWallet = wallet;
  let newStreak = wallet ? wallet.streakCount : 0;
  let nextLevelUnlocked = null;

  if (passed) {
    if (wallet) {
      const updateData = {
        lastCompletedDate: todayStr,
        lastAuditedDate: todayStr,
      };

      if (!isFreeTrial) {
        newStreak = (wallet.streakCount || 0) + 1;
        updateData.streakCount = newStreak;
      } else {
        newStreak = 0;
        updateData.streakCount = 0;
        if (parsedDay >= 3) {
          updateData.freeTrialDaysLeft = 0;
        } else {
          updateData.freeTrialDaysLeft = Math.max(0, 3 - parsedDay);
        }
      }

      updatedWallet = await walletRepository.updateWallet(userId, updateData);
    }

    // Level progression check if on final module day 30
    if (!isFreeTrial && parsedDay === 30) {
      const currentIdx = LEVEL_TRACKS.indexOf(level);
      if (currentIdx !== -1 && currentIdx < LEVEL_TRACKS.length - 1) {
        const nextLevel = LEVEL_TRACKS[currentIdx + 1];
        if (wallet && wallet.stakedAmount >= 100.0) {
          await userRepository.updateUser(userId, { level: nextLevel, currentDay: 1 });
          nextLevelUnlocked = nextLevel;
        }
      }
    }
  } else {
    // Slash 25 ETB penalty on exam failure for Staked Track only
    if (!isFreeTrial && wallet) {
      updatedWallet = await stakingService.applyExamFailurePenalty(userId, 25.0);
      if (updatedWallet && updatedWallet.stakedAmount < 100.0) {
        await userRepository.updateUser(userId, {
          isActive: false,
          status: 'PENDING_DEPOSIT',
        });
      }
    }
  }

  // Record daily progress (examCompleted is ONLY true if passed, attempts always increment)
  const newAttempts = priorAttempts + 1;
  await progressRepository.upsertDailyProgress({
    userId,
    level,
    dayNumber: parsedDay,
    progressDate: todayStr,
    updateData: {
      examCompleted: passed,
      examScore: score,
      examPassed: passed,
      examAttempts: newAttempts,
    },
  });

  // Persist a full ExamAttempt row so learners can review every exam they have ever taken
  const fullRecord = buildFullAttemptRecord(allQuestions, answers, questionMap);
  const examAttempt = await prisma.examAttempt
    .create({
      data: {
        userId,
        level,
        dayNumber: parsedDay,
        progressDate: todayStr,
        score,
        totalQuestions,
        passThreshold,
        passed,
        answersJson: JSON.stringify(fullRecord),
      },
    })
    .catch((err) => {
      console.error('Failed to persist ExamAttempt:', err);
      return null;
    });

  // Mistakes Review payload for the student
  const mistakes = buildMistakeReview(allQuestions, answers, questionMap);

  return {
    score,
    totalQuestions: 20,
    percentage: (score / 20) * 100,
    passed,
    passThreshold,
    attemptsTaken: priorAttempts + 1,
    adaptiveThresholdActive: priorAttempts >= 3,
    newStreak,
    nextLevelUnlocked,
    slashedPenalty: passed || isFreeTrial ? 0 : 25.0,
    mistakes,
    attempt: examAttempt
      ? {
          id: examAttempt.id,
          createdAt: examAttempt.createdAt,
          answers: fullRecord,
        }
      : null,
    wallet: updatedWallet,
  };
};

// Return every exam attempt ever taken by a learner (newest first)
export const getMyExamAttempts = async (userId) => {
  const attempts = await prisma.examAttempt
    .findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    .catch((err) => {
      console.error('Failed to load ExamAttempts:', err);
      return [];
    });

  return (attempts || []).map((a) => ({
    id: a.id,
    level: a.level,
    dayNumber: a.dayNumber,
    progressDate: a.progressDate,
    score: a.score,
    totalQuestions: a.totalQuestions,
    passThreshold: a.passThreshold,
    passed: a.passed,
    createdAt: a.createdAt,
    answers: (() => {
      try {
        return JSON.parse(a.answersJson || '[]');
      } catch {
        return [];
      }
    })(),
  }));
};
