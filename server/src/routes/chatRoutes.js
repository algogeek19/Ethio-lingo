import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import { authenticateToken, requireActiveAccount } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

// Public-ish community rooms (auth required, account must be active & verified)
router.use(requireActiveAccount);

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

// Messenger (Direct Chat) endpoints — learners at the same level
router.get('/peers', chatController.getPeers);
router.get('/direct/:peerId/messages', chatController.getDirectMessages);
router.post('/direct/:peerId/messages', chatController.postDirectMessage);

export default router;