import { apiClient } from '../../../services/apiClient';

export const authService = {
  login: async (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },
  logout: async () => {
    return apiClient.post('/auth/logout');
  },
};
