import { apiClient } from '../../../services/apiClient';

export const walletService = {
  depositChapa: async (amount, paymentMethod, phoneNumber) => {
    return apiClient.post('/chapa/deposit', { amount, paymentMethod, phoneNumber });
  },
  getLedger: async () => {
    return apiClient.get('/wallet/ledger');
  },
};
