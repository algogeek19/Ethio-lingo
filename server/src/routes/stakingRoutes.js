import { Router } from 'express';
import * as stakingController from '../controllers/stakingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { blockAdminFromLearnerFeatures } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(blockAdminFromLearnerFeatures);
router.get('/wallet', stakingController.getWallet);
router.post('/deposit', stakingController.deposit);
router.post(['/penalty/missed-day', '/missed-day-penalty'], stakingController.missedDayPenalty);
router.post(['/penalty/exam-fail', '/exam-fail-penalty'], stakingController.examFailPenalty);
router.post(['/streak/advance', '/advance-streak'], stakingController.advanceStreak);

export default router;
