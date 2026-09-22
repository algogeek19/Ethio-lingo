import { apiClient } from '../../../services/apiClient';

export const examService = {
  getDailyQuestions: async () => {
    return apiClient.get('/exam/daily');
  },
  submitExamAnswers: async (answers) => {
    return apiClient.post('/exam/submit', { answers });
  },
};
