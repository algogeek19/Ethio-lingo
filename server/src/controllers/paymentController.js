import * as paymentService from '../services/paymentService.js';
import { successResponse } from '../utils/apiResponse.js';

export const initializeDeposit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, email, firstName, lastName, phoneNumber } = req.body;
    const result = await paymentService.initializePayment(userId, { amount, email, firstName, lastName, phoneNumber });
    return successResponse(res, 'Deposit transaction initialized', result);
  } catch (err) {
    next(err);
  }
};

export const verifyDeposit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { txRef } = req.params;
    const result = await paymentService.verifyPayment(userId, txRef);
    return successResponse(res, 'Payment verified and escrow balance updated', result);
  } catch (err) {
    next(err);
  }
};

export const chapaWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-chapa-signature'];
    const result = await paymentService.handleChapaWebhook(req.body, signature);
    return successResponse(res, 'Webhook processed', result);
  } catch (err) {
    next(err);
  }
};
