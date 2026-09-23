import { Router } from 'express';
import * as examController from '../controllers/examController.js';
import { authenticateToken, requireActiveAccount } from '../middleware/authMiddleware.js';
import { blockAdminFromLearnerFeatures } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireActiveAccount);
router.use(blockAdminFromLearnerFeatures);
router.get(['/daily-questions', '/questions', '/daily'], examController.getExamQuestions);
router.post('/submit', examController.submitExam);
router.get('/attempts', examController.getMyExamAttempts);

export default router;
