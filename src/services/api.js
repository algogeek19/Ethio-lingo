import { storage } from './storage';

let API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? 'http://localhost:5000/api/v1'
    : 'https://ethio-lingo.onrender.com/api/v1');

const getAuthToken = async () => {
  try {
    const savedSession = await storage.getItem('birrend_auth_session');
    if (savedSession) {
      const parsed = typeof savedSession === 'string' ? JSON.parse(savedSession) : savedSession;
      return parsed.token || null;
    }
  } catch {}
  return null;
};

const request = async (endpoint, options = {}) => {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (netErr) {
      if (API_BASE_URL.includes(':5000')) {
        API_BASE_URL = 'http://localhost:5001/api/v1';
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      } else {
        throw netErr;
      }
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = (data.error && data.error.message) || data.message || 'API Request Failed';
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.status && error.status < 500) {
      console.warn(`API [${options.method || 'GET'} ${endpoint}] (${error.status}):`, error.message);
    } else {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error.message);
    }
    throw error;
  }
};

export const api = {
  // Authentication API
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (userData) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  googleLogin: (idToken) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  verifyEmailByCode: (code) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  verifyEmailByGoogle: (idToken) =>
    request('/auth/verify-email/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  getMe: () => request('/auth/me'),

  // Upload a file (PDF book / reference guide / payment receipt) to the server
  uploadFile: async (file) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });
    } catch (netErr) {
      if (API_BASE_URL.includes(':5000')) {
        API_BASE_URL = 'http://localhost:5001/api/v1';
        response = await fetch(`${API_BASE_URL}/files/upload`, {
          method: 'POST',
          body: formData,
          headers,
        });
      } else {
        throw netErr;
      }
    }

    const data = await response.json();
    if (!response.ok) {
      const errorMsg = (data.error && data.error.message) || data.message || 'File upload failed';
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  updateProfile: (name, avatar, level, currentDay, isOnboarded, isFreeTrial) => {
    const payload = {};
    if (typeof name === 'object' && name !== null) {
      Object.assign(payload, name);
    } else {
      if (name) payload.name = name;
      if (avatar) {
        payload.avatar = avatar;
        payload.image = avatar;
      }
      if (level) payload.level = level;
      if (currentDay !== undefined && currentDay !== null) payload.currentDay = currentDay;
      if (isOnboarded !== undefined) payload.isOnboarded = isOnboarded;
      if (isFreeTrial !== undefined) payload.isFreeTrial = isFreeTrial;
    }

    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),


  // Staking & Wallet API
  getWallet: () => request('/staking/wallet'),

  deposit: (amount = 1000.0) =>
    request('/staking/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  applyMissedDayPenalty: () =>
    request('/staking/penalty/missed-day', {
      method: 'POST',
    }),

  applyExamFailPenalty: () =>
    request('/staking/penalty/exam-fail', {
      method: 'POST',
    }),

  advanceStreak: () =>
    request('/staking/streak/advance', {
      method: 'POST',
    }),

  // Daily Workspace & Tasks API
  getDailyWorkspace: (level, day) =>
    request(`/workspaces/daily?level=${encodeURIComponent(level)}&day=${encodeURIComponent(day)}`),

  completeTask: (level, day, taskType, seconds = 180, extraData = {}) =>
    request('/workspaces/complete-task', {
      method: 'POST',
      body: JSON.stringify({ level, day, taskType, seconds, ...extraData }),
    }),

  // Daily Exam API
  getDailyExamQuestions: (level, day) =>
    request(`/exams/questions?level=${encodeURIComponent(level)}&day=${encodeURIComponent(day)}`),

  submitExam: (level, day, answers) =>
    request('/exams/submit', {
      method: 'POST',
      body: JSON.stringify({ level, day, answers }),
    }),

  getMyExamAttempts: () => request('/exams/attempts'),

  // Deposit & Payment Account API (Learner & General)
  getActivePaymentAccounts: () => request('/deposits/payment-accounts'),

  getMyDepositStatus: () => request('/deposits/my-status'),

  submitDepositRequest: (depositData) =>
    request('/deposits/request', {
      method: 'POST',
      body: JSON.stringify(depositData),
    }),

  submitDepositVerification: (depositData) =>
    request('/deposits/request', {
      method: 'POST',
      body: JSON.stringify(depositData),
    }),

  getPendingDepositRequest: () => request('/deposits/my-status'),

  // Withdrawal Requests API
  requestWithdrawal: (requestData) =>
    request('/withdrawals/request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  getMyWithdrawalRequests: () => request('/withdrawals/my-requests'),

  getAllWithdrawalRequests: () => request('/withdrawals/admin-all'),

  processWithdrawalStatus: (id, status) =>
    request(`/withdrawals/process/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Admin Portal Management API
  getAdminMetrics: () => request('/admin/analytics'),

  getAdminAnalytics: () => request('/admin/analytics'),

  getLearnerDirectory: () => request('/admin/learners'),

  getLearnerDetails: (id) => request(`/admin/learners/${id}/details`),

  updateLearner: (id, data) =>
    request(`/admin/learners/${id}/update`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  adjustLearnerBalance: (id, payload) =>
    request(`/admin/learners/${id}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPaymentAdminData: () => request('/deposits/admin/requests'),

  getAllDepositRequests: () => request('/deposits/admin/requests'),

  getAllPaymentAccounts: () => request('/deposits/admin/payment-accounts'),

  processDepositStatus: (id, status, declineReason = '') =>
    request(`/deposits/admin/process/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status, declineReason }),
    }),

  approveDepositRequest: (id) =>
    request(`/deposits/admin/process/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'approved' }),
    }),

  declineDepositRequest: (id, declineReason) =>
    request(`/deposits/admin/process/${id}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'declined', declineReason }),
    }),

  createPaymentAccount: (accountData) =>
    request('/deposits/admin/payment-accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    }),

  updatePaymentAccount: (id, accountData) =>
    request(`/deposits/admin/payment-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    }),

  togglePaymentAccountStatus: (id, isPrimary) =>
    request(`/deposits/admin/payment-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isPrimary }),
    }),

  deletePaymentAccount: (id) =>
    request(`/deposits/admin/payment-accounts/${id}`, {
      method: 'DELETE',
    }),

  // Admin Curriculum Management API
  getPopulatedModules: (level) =>
    request(`/admin/modules/populated?level=${encodeURIComponent(level)}`),

  upsertModule: (moduleData) =>
    request('/admin/modules/upsert', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    }),

  upsertModuleData: (moduleData) =>
    request('/admin/modules/upsert', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    }),

  importQuestions: (jsonArray) =>
    request('/admin/questions/import', {
      method: 'POST',
      body: JSON.stringify({ questions: jsonArray }),
    }),

  // System Settings API
  getLandingVideoSetting: () => request('/settings/landing-video'),

  updateLandingVideoSetting: (videoUrl) =>
    request('/admin/settings/landing-video', {
      method: 'POST',
      body: JSON.stringify({ videoUrl }),
    }),

  // Placement Quiz API
  getPlacementQuestions: () => request('/auth/placement-quiz/questions'),

  submitPlacement: (answers) =>
    request('/auth/placement-quiz', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  // Community Chat API
  getChatRooms: () => request('/chat/rooms'),

  getDailyChatTopic: () => request('/chat/topics/daily'),

  getChatMessages: (room, after = null) =>
    request(`/chat/messages?room=${encodeURIComponent(room)}${after ? `&after=${encodeURIComponent(after)}` : ''}`),

  postChatMessage: (room, content) =>
    request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ room, content }),
    }),

  reportChatMessage: (messageId, reason) =>
    request(`/chat/messages/${messageId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Messenger (Direct Chat) API — learners at the same level
  getDirectChatPeers: () => request('/chat/peers'),

  getDirectMessages: (peerId) => request(`/chat/direct/${peerId}/messages`),

  postDirectMessage: (peerId, content) =>
    request(`/chat/direct/${peerId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Announcements API
  getAnnouncements: () => request('/announcements'),

  getAdminAnnouncements: () => request('/announcements/all'),

  createAnnouncement: (payload) =>
    request('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAnnouncement: (id, payload) =>
    request(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAnnouncement: (id) =>
    request(`/announcements/${id}`, {
      method: 'DELETE',
    }),

  // Feedback API
  submitFeedback: (payload) =>
    request('/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getFeedback: (status = null) =>
    request(`/feedback${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  updateFeedbackStatus: (id, status) =>
    request(`/feedback/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Admin: Exam Analytics & Financial Overview
  getAdminExamAnalytics: () => request('/admin/analytics/exams'),

  getAdminFinancialOverview: () => request('/admin/finance/overview'),

  // Admin: Community Moderation (reported chat messages)
  getChatReports: (status = null) =>
    request(`/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  resolveChatReport: (id, status, banReportedUser = false) =>
    request(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, banReportedUser }),
    }),

  setLearnerBanStatus: (id, isBanned) =>
    request(`/admin/learners/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ isBanned }),
    }),
};
