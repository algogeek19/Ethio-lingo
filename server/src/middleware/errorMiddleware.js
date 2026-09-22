import logger from '../utils/logger.js';
import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
    details: err.details || null,
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  return errorResponse(res, message, statusCode, err.details || null);
};
