import { Router } from 'express';
import * as depositController from '../controllers/depositController.js';
import * as storageController from '../controllers/storageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Public / Learner routes for payment accounts
router.get('/payment-accounts', depositController.getActivePaymentAccounts);

// Protected Learner routes
router.use(authenticateToken);
router.post('/request', depositController.submitDepositRequest);
router.get('/my-status', depositController.getMyDepositStatus);
// Short-lived signed upload URL so the browser never needs Storage write access
router.post('/upload-receipt-url', storageController.getDepositReceiptUploadUrl);

// Admin-only routes
router.get('/admin/payment-accounts', requireRole('admin'), depositController.getAllPaymentAccounts);
router.post('/admin/payment-accounts', requireRole('admin'), depositController.createPaymentAccount);
router.put('/admin/payment-accounts/:id', requireRole('admin'), depositController.updatePaymentAccount);
router.delete('/admin/payment-accounts/:id', requireRole('admin'), depositController.deletePaymentAccount);

router.get('/admin/requests', requireRole('admin'), depositController.getAllDepositRequests);
router.post('/admin/process/:id', requireRole('admin'), depositController.processDepositRequest);

export default router;
