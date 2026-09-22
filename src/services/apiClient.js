// Simulated API Client for Birrend platform endpoint definitions
export const apiClient = {
  get: async (endpoint) => {
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 300));
  },
  post: async (endpoint, data) => {
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true, data }), 400));
  },
};
