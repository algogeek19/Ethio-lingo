import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/google', authController.googleLogin);
router.post('/verify-email', authenticateToken, authController.verifyEmail);
router.post('/verify-email/google', authenticateToken, authController.verifyEmailGoogle);
router.post('/resend-verification-code', authenticateToken, authController.resendVerificationCode);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);
router.get('/placement-quiz/questions', authController.getPlacementQuestions);
router.post('/placement-quiz', authenticateToken, authController.submitPlacement);

export default router;
