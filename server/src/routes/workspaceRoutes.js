import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import { authenticateToken, requireActiveAccount } from '../middleware/authMiddleware.js';
import { blockAdminFromLearnerFeatures } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireActiveAccount);
router.get('/daily', workspaceController.getDailyWorkspace);
router.post('/complete-task', blockAdminFromLearnerFeatures, workspaceController.completeTask);

export default router;
