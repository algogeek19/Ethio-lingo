import * as depositService from '../services/depositService.js';
import { successResponse } from '../utils/apiResponse.js';

// Public / Learner: Get Active Payment Accounts
export const getActivePaymentAccounts = async (req, res, next) => {
  try {
    const accounts = await depositService.getActivePaymentAccounts();
    return successResponse(res, 'Active payment accounts fetched', accounts);
  } catch (err) {
    next(err);
  }
};

// Admin: Get All Payment Accounts
export const getAllPaymentAccounts = async (req, res, next) => {
  try {
    const accounts = await depositService.getAllPaymentAccounts();
    return successResponse(res, 'All payment accounts fetched', accounts);
  } catch (err) {
    next(err);
  }
};

// Admin: Create Payment Account
export const createPaymentAccount = async (req, res, next) => {
  try {
    const account = await depositService.createPaymentAccount(req.body);
    return successResponse(res, 'Payment account created successfully', account, 201);
  } catch (err) {
    next(err);
  }
};

// Admin: Update Payment Account
export const updatePaymentAccount = async (req, res, next) => {
  try {
    const account = await depositService.updatePaymentAccount(req.params.id, req.body);
    return successResponse(res, 'Payment account updated successfully', account);
  } catch (err) {
    next(err);
  }
};

// Admin: Delete Payment Account
export const deletePaymentAccount = async (req, res, next) => {
  try {
    const result = await depositService.deletePaymentAccount(req.params.id);
    return successResponse(res, 'Payment account deleted successfully', result);
  } catch (err) {
    next(err);
  }
};

// Learner: Submit Deposit Verification Request
export const submitDepositRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deposit = await depositService.createDepositRequest(userId, req.body);
    return successResponse(res, 'Deposit verification request submitted successfully', deposit, 201);
  } catch (err) {
    next(err);
  }
};

// Learner: Get My Deposit Request Status
export const getMyDepositStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deposit = await depositService.getUserLatestDepositRequest(userId);
    return successResponse(res, 'User deposit request status fetched', deposit || null);
  } catch (err) {
    next(err);
  }
};

// Admin: Get All Deposit Requests
export const getAllDepositRequests = async (req, res, next) => {
  try {
    const deposits = await depositService.getAllDepositRequests();
    return successResponse(res, 'All deposit verification requests fetched', deposits);
  } catch (err) {
    next(err);
  }
};

// Admin: Process Deposit Request (Approve or Decline)
export const processDepositRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, declineReason } = req.body;
    const result = await depositService.processDepositRequest(id, status, declineReason);
    return successResponse(res, `Deposit request ${status} successfully`, result);
  } catch (err) {
    next(err);
  }
};
