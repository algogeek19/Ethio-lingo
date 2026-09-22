import * as stakingService from '../services/stakingService.js';
import { successResponse } from '../utils/apiResponse.js';

export const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const overview = await stakingService.getWalletOverview(userId);
    return successResponse(res, 'Escrow wallet fetched', overview);
  } catch (err) {
    next(err);
  }
};

export const deposit = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const { amount = 1000.0 } = req.body;
    const wallet = await stakingService.processDeposit(userId, parseFloat(amount));
    return successResponse(res, 'Deposit processed (10% fee deducted, net stake updated)', wallet);
  } catch (err) {
    next(err);
  }
};

export const missedDayPenalty = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const wallet = await stakingService.applyMissedDayStreakBreakPenalty(userId, 80.0);
    return successResponse(res, 'Missed day penalty applied (-100 ETB slashed, streak reset to 0)', wallet);
  } catch (err) {
    next(err);
  }
};

export const examFailPenalty = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const wallet = await stakingService.applyExamFailurePenalty(userId, 25.0);
    return successResponse(res, 'Exam failure penalty applied (-40 ETB slashed)', wallet);
  } catch (err) {
    next(err);
  }
};

export const advanceStreak = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const wallet = await stakingService.advanceUserStreak(userId);
    return successResponse(res, 'User streak advanced (+1 Day)', wallet);
  } catch (err) {
    next(err);
  }
};
