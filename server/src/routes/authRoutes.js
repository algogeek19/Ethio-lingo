import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);
router.get('/placement-quiz/questions', authController.getPlacementQuestions);
router.post('/placement-quiz', authenticateToken, authController.submitPlacement);

export default router;
