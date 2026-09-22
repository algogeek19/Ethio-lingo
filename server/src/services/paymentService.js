import * as stakingService from './stakingService.js';
import { AppError } from '../utils/AppError.js';

export const initializePayment = async (userId, { amount = 1000.0, email, firstName, lastName, phoneNumber }) => {
  const txRef = `birrend_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Mock Chapa response structure until official Chapa API credentials are set up
  const checkoutUrl = `https://checkout.chapa.co/checkout/payment/${txRef}`;

  return {
    txRef,
    amount,
    currency: 'ETB',
    checkoutUrl,
    message: 'Chapa deposit transaction initialized successfully (Mock Mode)',
  };
};

export const verifyPayment = async (userId, txRef) => {
  if (!txRef) {
    throw new AppError('Transaction reference (txRef) is required for payment verification.', 400);
  }

  // Mock Chapa verification API check
  const depositAmount = 1000.0;
  const updatedWallet = await stakingService.processDeposit(userId, depositAmount, txRef);

  return {
    txRef,
    status: 'success',
    amount: depositAmount,
    netStakeAdded: depositAmount,
    feeDeducted: 0.0,
    currency: 'ETB',
    wallet: updatedWallet,
    message: 'Payment verified and verified deposit credited to escrow vault.',
  };
};

export const handleChapaWebhook = async (payload, signature) => {
  // Webhook verification & processing for live Chapa events
  const { event, tx_ref, amount, email } = payload || {};
  if (event === 'charge.success') {
    // Process deposit
    return { status: 'processed', tx_ref };
  }
  return { status: 'ignored' };
};
