import { Router } from 'express';
import authRoutes from './authRoutes.js';
import stakingRoutes from './stakingRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import examRoutes from './examRoutes.js';
import withdrawalRoutes from './withdrawalRoutes.js';
import adminRoutes from './adminRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import depositRoutes from './depositRoutes.js';
import chatRoutes from './chatRoutes.js';
import announcementRoutes from './announcementRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';

import * as adminController from '../controllers/adminController.js';

const router = Router();

// Public System Settings
router.get('/settings/landing-video', adminController.getLandingVideoSetting);

router.use('/auth', authRoutes);
router.use('/staking', stakingRoutes);
router.use('/payments', paymentRoutes);
router.use('/deposits', depositRoutes);
router.use(['/workspace', '/workspaces'], workspaceRoutes);
router.use(['/exam', '/exams'], examRoutes);
router.use(['/withdrawal', '/withdrawals'], withdrawalRoutes);
router.use('/admin', adminRoutes);
router.use('/chat', chatRoutes);
router.use('/announcements', announcementRoutes);
router.use('/feedback', feedbackRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Birrend Financial Escrow Backend API (Supabase Auth Integrated)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
