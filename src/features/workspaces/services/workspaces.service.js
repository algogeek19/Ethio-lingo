import { apiClient } from '../../../services/apiClient';

export const workspacesService = {
  getCourseMedia: async (courseId) => {
    return apiClient.get(`/workspaces/${courseId}`);
  },
};
