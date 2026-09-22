import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { blockAdminFromLearnerFeatures } from '../middleware/rbacMiddleware.js';

const router = Router();

router.post('/initialize', authenticateToken, blockAdminFromLearnerFeatures, paymentController.initializeDeposit);
router.get('/verify/:txRef', authenticateToken, blockAdminFromLearnerFeatures, paymentController.verifyDeposit);
router.post('/webhook', paymentController.chapaWebhook);

export default router;
