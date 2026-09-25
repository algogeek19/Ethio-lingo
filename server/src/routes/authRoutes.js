import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiterMiddleware.js';

const router = Router();

// Credential / verification endpoints are throttled to slow brute-force attempts
router.post('/login', authRateLimiter, authController.login);
router.post('/signup', authRateLimiter, authController.signup);
router.post('/google', authRateLimiter, authController.googleLogin);
router.post('/verify-email', authenticateToken, authRateLimiter, authController.verifyEmail);
router.post('/verify-email/google', authenticateToken, authRateLimiter, authController.verifyEmailGoogle);
router.post('/resend-verification-code', authenticateToken, authRateLimiter, authController.resendVerificationCode);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authRateLimiter, authController.changePassword);
router.get('/placement-quiz/questions', authController.getPlacementQuestions);
router.post('/placement-quiz', authenticateToken, authController.submitPlacement);

export default router;
