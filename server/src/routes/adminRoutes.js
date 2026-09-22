import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

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
router.post('/learners/:id/adjust-balance', adminController.adjustLearnerBalance);
router.get('/modules/populated', adminController.getPopulatedModules);
router.post('/questions/import', adminController.importQuestions);
router.post('/modules/upsert', adminController.upsertModule);
router.get('/books', adminController.getLevelBooks);
router.post('/books/add', adminController.addLevelBook);
router.delete('/books/:id', adminController.deleteLevelBook);
router.get('/settings/landing-video', adminController.getLandingVideoSetting);
router.post('/settings/landing-video', adminController.updateLandingVideoSetting);

export default router;
