import * as feedbackService from '../services/feedbackService.js';
import { successResponse } from '../utils/apiResponse.js';

export const submitFeedback = async (req, res, next) => {
  try {
    const user = req.user || null;
    const feedback = await feedbackService.submitFeedback({
      userId: user ? user.id : null,
      name: user ? user.name : null,
      category: req.body.category,
      message: req.body.message,
      rating: req.body.rating,
    });
    return successResponse(res, 'Feedback submitted. Thank you for helping us improve Birrend.', feedback, 201);
  } catch (err) {
    next(err);
  }
};

export const listFeedback = async (req, res, next) => {
  try {
    const { status = null } = req.query;
    const feedback = await feedbackService.listFeedback(status);
    return successResponse(res, 'Feedback list fetched', feedback);
  } catch (err) {
    next(err);
  }
};

export const updateFeedbackStatus = async (req, res, next) => {
  try {
    const feedback = await feedbackService.updateFeedbackStatus(req.params.id, req.body.status);
    return successResponse(res, 'Feedback status updated', feedback);
  } catch (err) {
    next(err);
  }
};