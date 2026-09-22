import * as adminService from '../services/adminService.js';
import * as curriculumRepository from '../repositories/curriculumRepository.js';
import { prisma } from '../config/database.js';
import { successResponse } from '../utils/apiResponse.js';

export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await adminService.getAdminAnalytics();
    return successResponse(res, 'Admin platform analytics fetched', analytics);
  } catch (err) {
    next(err);
  }
};

export const getLearners = async (req, res, next) => {
  try {
    const learners = await adminService.getLearnerDirectory();
    return successResponse(res, 'Learner directory fetched', learners);
  } catch (err) {
    next(err);
  }
};

export const getLearnerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const learner = await adminService.fetchLearnerFullDetails(id);
    return successResponse(res, 'Learner details fetched', learner);
  } catch (err) {
    next(err);
  }
};

export const updateLearner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await adminService.updateLearnerProfile(id, req.body);
    return successResponse(res, 'Learner profile updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

export const adjustLearnerBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.adjustLearnerWalletBalance(id, req.body);
    return successResponse(res, 'Student balance adjusted successfully', result);
  } catch (err) {
    next(err);
  }
};

export const importQuestions = async (req, res, next) => {
  try {
    const count = await adminService.importQuestionBankArray(req.body);
    return successResponse(res, `Successfully imported ${count} questions into database question bank`, { importedCount: count });
  } catch (err) {
    next(err);
  }
};

export const upsertModule = async (req, res, next) => {
  try {
    const moduleData = await curriculumRepository.upsertCurriculumModule(req.body);
    return successResponse(res, 'Curriculum module content updated', moduleData);
  } catch (err) {
    next(err);
  }
};

export const getLevelBooks = async (req, res, next) => {
  try {
    const { level } = req.query;
    const books = await curriculumRepository.findBooksByLevel(level || 'Beginner I');
    return successResponse(res, 'PDF books for level fetched', books);
  } catch (err) {
    next(err);
  }
};

export const addLevelBook = async (req, res, next) => {
  try {
    const book = await curriculumRepository.createLevelBook(req.body);
    return successResponse(res, 'PDF book added to level catalog', book, 201);
  } catch (err) {
    next(err);
  }
};

export const deleteLevelBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    await curriculumRepository.deleteLevelBook(id);
    return successResponse(res, 'PDF book deleted from level catalog');
  } catch (err) {
    next(err);
  }
};

export const getPopulatedModules = async (req, res, next) => {
  try {
    const { level } = req.query;
    const dayNumbers = await curriculumRepository.findPopulatedModuleDaysByLevel(level || 'Beginner I');
    return successResponse(res, 'Populated module days fetched', dayNumbers);
  } catch (err) {
    next(err);
  }
};

export const getLandingVideoSetting = async (req, res, next) => {
  try {
    let videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    if (prisma.systemSetting) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'landing_video_url' },
      });
      if (setting?.value) {
        videoUrl = setting.value;
      }
    }
    return successResponse(res, 'Landing page video URL retrieved', { videoUrl });
  } catch (err) {
    // Safe fallback so endpoint never 500s on ungenerated Prisma client
    return successResponse(res, 'Landing page video URL retrieved', {
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  }
};

export const updateLandingVideoSetting = async (req, res, next) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid video URL string is required' });
    }
    if (!prisma.systemSetting) {
      return res.status(500).json({ success: false, message: 'SystemSetting model not initialized' });
    }
    const updated = await prisma.systemSetting.upsert({
      where: { key: 'landing_video_url' },
      update: { value: videoUrl.trim() },
      create: { key: 'landing_video_url', value: videoUrl.trim() },
    });
    return successResponse(res, 'Landing page video URL updated successfully', { videoUrl: updated.value });
  } catch (err) {
    next(err);
  }
};

export const getExamAnalytics = async (req, res, next) => {
  try {
    const analytics = await adminService.getExamAnalytics();
    return successResponse(res, 'Exam analytics fetched', analytics);
  } catch (err) {
    next(err);
  }
};

export const getFinancialOverview = async (req, res, next) => {
  try {
    const overview = await adminService.getFinancialOverview();
    return successResponse(res, 'Financial overview fetched', overview);
  } catch (err) {
    next(err);
  }
};

export const getChatReports = async (req, res, next) => {
  try {
    const { status = null } = req.query;
    const reports = await adminService.getReportedMessages(status);
    return successResponse(res, 'Reported chat messages fetched', reports);
  } catch (err) {
    next(err);
  }
};

export const resolveChatReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, banReportedUser = false } = req.body;
    const report = await adminService.resolveChatReport(id, status, banReportedUser);
    return successResponse(res, 'Chat report resolved', report);
  } catch (err) {
    next(err);
  }
};

export const setLearnerBanStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;
    const updated = await adminService.setUserBanStatus(id, !!isBanned);
    return successResponse(res, isBanned ? 'Learner banned from community chat & platform' : 'Learner unblocked', updated);
  } catch (err) {
    next(err);
  }
};

