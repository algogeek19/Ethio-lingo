import { Router } from 'express';
import * as feedbackController from '../controllers/feedbackController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);

// Learners: submit feedback
router.post('/submit', feedbackController.submitFeedback);

// Admin-only management
router.use(requireRole('admin'));
router.get('/', feedbackController.listFeedback);
router.patch('/:id/status', feedbackController.updateFeedbackStatus);

export default router;