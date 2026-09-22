import * as examService from '../services/examService.js';
import { successResponse } from '../utils/apiResponse.js';

export const getExamQuestions = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { level = req.user?.level || 'Beginner I', day = 1 } = req.query;
    const questions = await examService.getDailyExamQuestions(userId, level, day);
    return successResponse(res, 'Exam questions unlocked and fetched (20 random questions)', questions);
  } catch (err) {
    next(err);
  }
};

export const submitExam = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'usr_learner_001';
    const { level = req.user?.level || 'Beginner I', day = 1, answers } = req.body;
    const result = await examService.submitExamAnswers(userId, level, day, answers);
    return successResponse(
      res,
      result.passed ? 'Exam Passed! Streak incremented.' : 'Exam Failed. 25 ETB penalty slashed.',
      result
    );
  } catch (err) {
    next(err);
  }
};
