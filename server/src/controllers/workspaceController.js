import * as workspaceService from '../services/workspaceService.js';
import { successResponse } from '../utils/apiResponse.js';

export const getDailyWorkspace = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const { level = 'Beginner I', day = 1 } = req.query;
    const data = await workspaceService.getDailyWorkspaceData(userId, level, day);
    return successResponse(res, 'Workspace module data fetched', data);
  } catch (err) {
    next(err);
  }
};

export const completeTask = async (req, res, next) => {
  try {
    const userId = req.user.id || 'usr_learner_001';
    const { level = 'Beginner I', day = 1, taskType, seconds, passed, score, examCompleted, examPassed } = req.body;
    const progress = await workspaceService.updateTaskCompletion(userId, level, day, taskType, {
      seconds,
      passed,
      score,
      examCompleted,
      examPassed,
      ...req.body,
    });
    return successResponse(res, 'Task completion updated', progress);
  } catch (err) {
    next(err);
  }
};
