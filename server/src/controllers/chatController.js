import * as chatService from '../services/chatService.js';
import { successResponse } from '../utils/apiResponse.js';

export const getRooms = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const data = await chatService.getRoomsForUser(userId);
    return successResponse(res, 'Chat rooms fetched', data);
  } catch (err) {
    next(err);
  }
};

export const getMembers = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { room } = req.params;
    const members = await chatService.getRoomMembers(userId, decodeURIComponent(room));
    return successResponse(res, 'Chat room members fetched', members);
  } catch (err) {
    next(err);
  }
};

export const getDailyTopic = async (req, res, next) => {
  try {
    return successResponse(res, 'Daily chat topic fetched', chatService.getDailyTopic());
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { room, after } = req.query;
    const messages = await chatService.getChatMessages(userId, room, after || null);
    return successResponse(res, 'Chat messages fetched', messages);
  } catch (err) {
    next(err);
  }
};

export const postMessage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { room, content, replyToId } = req.body;
    const message = await chatService.postChatMessage(userId, room, content, replyToId || null);
    return successResponse(res, 'Chat message sent', message, 201);
  } catch (err) {
    next(err);
  }
};

export const updateMessage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { messageId } = req.params;
    const { content } = req.body;
    const message = await chatService.editChatMessage(userId, messageId, content);
    return successResponse(res, 'Chat message edited', message);
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { messageId } = req.params;
    const result = await chatService.deleteChatMessage(userId, messageId);
    return successResponse(res, 'Chat message deleted', result);
  } catch (err) {
    next(err);
  }
};

export const toggleReaction = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { messageId } = req.params;
    const { emoji } = req.body;
    const message = await chatService.toggleMessageReaction(userId, messageId, emoji);
    return successResponse(res, 'Chat reaction updated', message);
  } catch (err) {
    next(err);
  }
};

export const reportMessage = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { messageId } = req.params;
    const { reason } = req.body;
    const result = await chatService.reportChatMessage(userId, messageId, reason);
    return successResponse(
      res,
      result.duplicate ? 'Report already filed for this message and is under review.' : 'Message reported. Our moderators will review it shortly.',
      result
    );
  } catch (err) {
    next(err);
  }
};

export const setTyping = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { room } = req.params;
    const data = await chatService.setRoomTyping(userId, decodeURIComponent(room));
    return successResponse(res, 'Typing status updated', data);
  } catch (err) {
    next(err);
  }
};

export const getTyping = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { room } = req.params;
    const typing = await chatService.getRoomTyping(userId, decodeURIComponent(room));
    return successResponse(res, 'Typing users fetched', typing);
  } catch (err) {
    next(err);
  }
};
