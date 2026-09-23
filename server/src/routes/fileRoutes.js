import { Router } from 'express';
import upload from '../middleware/uploadMiddleware.js';
import * as fileController from '../controllers/fileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Authenticated upload (PDF reference guides, reading books, payment receipts)
router.post('/upload', authenticateToken, upload.single('file'), fileController.uploadFile);

// Public file retrieval (served in iframes / <img> tags where auth headers can't be sent)
router.get('/:id', fileController.getFile);

export default router;