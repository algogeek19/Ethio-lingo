import * as withdrawalService from '../services/withdrawalService.js';
import { successResponse } from '../utils/apiResponse.js';

export const createRequest = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const withdrawal = await withdrawalService.requestWithdrawal(userId, req.body);
    return successResponse(res, 'Withdrawal request created successfully', withdrawal, 201);
  } catch (err) {
    next(err);
  }
};

export const getMyRequests = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const requests = await withdrawalService.getUserWithdrawalRequests(userId);
    return successResponse(res, 'Withdrawal requests fetched', requests);
  } catch (err) {
    next(err);
  }
};

export const getAllRequests = async (req, res, next) => {
  try {
    const requests = await withdrawalService.getAllWithdrawalRequests();
    return successResponse(res, 'All withdrawal requests fetched', requests);
  } catch (err) {
    next(err);
  }
};

export const processStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await withdrawalService.processWithdrawalStatus(id, status);
    return successResponse(res, `Withdrawal request status updated to ${status}`, updated);
  } catch (err) {
    next(err);
  }
};
