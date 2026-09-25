import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import * as storageController from '../controllers/storageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { adminActionLimiter } from '../middleware/rateLimiterMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/exams', adminController.getExamAnalytics);
router.get('/finance/overview', adminController.getFinancialOverview);
router.get('/reports', adminController.getChatReports);
router.patch('/reports/:id', adminController.resolveChatReport);
router.patch('/learners/:id/ban', adminController.setLearnerBanStatus);
router.get('/learners', adminController.getLearners);
router.get('/learners/:id/details', adminController.getLearnerDetails);
router.patch('/learners/:id/update', adminController.updateLearner);
// Sensitive financial mutation — throttled to 30/min per IP
router.post('/learners/:id/adjust-balance', adminActionLimiter, adminController.adjustLearnerBalance);
router.get('/modules/populated', adminController.getPopulatedModules);
router.post('/questions/import', adminController.importQuestions);
router.post('/modules/upsert', adminController.upsertModule);
router.get('/books', adminController.getLevelBooks);
router.post('/books/add', adminController.addLevelBook);
router.delete('/books/:id', adminController.deleteLevelBook);
router.get('/settings/landing-video', adminController.getLandingVideoSetting);
router.post('/settings/landing-video', adminController.updateLandingVideoSetting);
router.post('/storage/upload-url', storageController.getAdminUploadUrl);

export default router;
