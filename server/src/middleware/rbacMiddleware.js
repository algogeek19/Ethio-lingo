import { errorResponse } from '../utils/apiResponse.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized: User authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required role(s): ${allowedRoles.join(', ')}.`,
        403
      );
    }

    next();
  };
};

export const blockAdminFromLearnerFeatures = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return errorResponse(
      res,
      'Forbidden: Admin accounts do not have escrow wallets, streak tracking, or daily exams.',
      403
    );
  }
  next();
};
