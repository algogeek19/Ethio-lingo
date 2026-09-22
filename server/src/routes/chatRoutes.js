import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/rooms', chatController.getRooms);
router.get('/rooms/:room/members', chatController.getMembers);
router.post('/rooms/:room/typing', chatController.setTyping);
router.get('/rooms/:room/typing', chatController.getTyping);
router.get('/topics/daily', chatController.getDailyTopic);
router.get('/messages', chatController.getMessages);
router.post('/messages', chatController.postMessage);
router.post('/messages/:messageId/report', chatController.reportMessage);
router.post('/messages/:messageId/edit', chatController.updateMessage);
router.post('/messages/:messageId/reaction', chatController.toggleReaction);
router.delete('/messages/:messageId', chatController.deleteMessage);

export default router;