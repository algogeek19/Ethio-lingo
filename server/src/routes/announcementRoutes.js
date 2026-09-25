import { Router } from 'express';
import * as announcementController from '../controllers/announcementController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);

// Learner-facing: published announcements filtered by audience level
router.get('/', announcementController.listAnnouncements);

// Admin-only management
router.use(requireRole('admin'));
router.get('/all', announcementController.listAllAnnouncements);
router.get('/audience-count', announcementController.getAudienceCount);
router.get('/sms-logs', announcementController.listSmsLogs);
router.post('/', announcementController.createAnnouncement);
router.patch('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);

export default router;