import { Router } from 'express';
import * as withdrawalController from '../controllers/withdrawalController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.post('/request', withdrawalController.createRequest);
router.get('/my-requests', withdrawalController.getMyRequests);

// Admin Payout Management Endpoints
router.get(['/admin-all', '/admin/all'], requireRole('admin'), withdrawalController.getAllRequests);
router.post(['/process/:id', '/admin/process/:id'], requireRole('admin'), withdrawalController.processStatus);

export default router;
