import rateLimit from 'express-rate-limit';

/**
 * Standard error response formatter for rate-limit breaches
 */
const createRateLimitHandler = (message) => (req, res) => {
  return res.status(429).json({
    success: false,
    error: {
      message,
      retryAfterSeconds: Math.ceil(res.getHeader('Retry-After') || 60),
    },
  });
};

/**
 * Authentication Rate Limiter
 * Applied to: /api/v1/auth/login, /api/v1/auth/signup, /api/v1/auth/change-password
 * 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 attempts
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.'
  ),
});

/**
 * General API Rate Limiter
 * Applied to: all /api/v1/* routes
 * 300 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Max 300 requests
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Too many requests to the platform. Please slow down and try again shortly.'
  ),
});

/**
 * Sensitive Admin Action Rate Limiter
 * Applied to sensitive balance updates or user management
 * 30 requests per minute per IP
 */
export const adminActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // Max 30 actions
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler(
    'Admin action throttled. Too many administrative adjustments requested in a short period.'
  ),
});
