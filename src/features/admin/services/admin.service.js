import { apiClient } from '../../../services/apiClient';

export const adminService = {
  getAnalytics: async () => {
    return apiClient.get('/admin/analytics');
  },
  approvePayout: async (learnerId) => {
    return apiClient.post(`/admin/payout/${learnerId}/approve`);
  },
};
