import * as announcementService from '../services/announcementService.js';
import { successResponse } from '../utils/apiResponse.js';

export const listAnnouncements = async (req, res, next) => {
  try {
    const level = req.user ? req.user.level : 'Beginner I';
    const isFreeTrial = req.user && req.user.wallet ? !!req.user.wallet.isFreeTrial : false;
    const announcements = await announcementService.getPublishedAnnouncements(level, isFreeTrial);
    return successResponse(res, 'Announcements fetched', announcements);
  } catch (err) {
    next(err);
  }
};

export const listAllAnnouncements = async (req, res, next) => {
  try {
    const { includeInactive = 'true' } = req.query;
    const announcements = await announcementService.listAllAnnouncements(includeInactive === 'true');
    return successResponse(res, 'All announcements fetched', announcements);
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const adminUser = req.user ? req.user : null;
    const announcement = await announcementService.createAnnouncement({
      createdBy: adminUser ? adminUser.id : 'admin',
      createdByName: adminUser ? adminUser.name || 'Admin' : 'Admin',
      title: req.body.title,
      content: req.body.content,
      audienceLevel: req.body.audienceLevel || 'ALL',
    });
    return successResponse(res, 'Announcement published', announcement, 201);
  } catch (err) {
    next(err);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await announcementService.updateAnnouncement(req.params.id, req.body);
    return successResponse(res, 'Announcement updated', announcement);
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const result = await announcementService.deleteAnnouncement(req.params.id);
    return successResponse(res, 'Announcement deleted', result);
  } catch (err) {
    next(err);
  }
};