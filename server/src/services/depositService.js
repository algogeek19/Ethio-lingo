import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { safeDbQuery } from '../utils/dbHelper.js';

let MOCK_PAYMENT_ACCOUNTS = [
  {
    id: 'pa-1',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    accountName: 'Birrend EdTech PLC',
    accountNumber: '1000123456789',
    instructions: 'Transfer stake amount via Mobile Banking app or Branch.',
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'pa-2',
    bankName: 'Telebirr (SuperApp)',
    accountName: 'Birrend EdTech',
    accountNumber: '0911234567',
    instructions: 'Send money to Telebirr merchant/mobile number.',
    isActive: true,
    createdAt: new Date(),
  },
];

let MOCK_DEPOSIT_REQUESTS = [];

// --- PAYMENT ACCOUNTS (ADMIN CRUD & LEARNER FETCH) ---

export const getActivePaymentAccounts = async () => {
  return await safeDbQuery(
    () =>
      prisma.paymentAccount.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
    () => MOCK_PAYMENT_ACCOUNTS.filter((acc) => acc.isActive)
  );
};

export const getAllPaymentAccounts = async () => {
  return await safeDbQuery(
    () =>
      prisma.paymentAccount.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    () => MOCK_PAYMENT_ACCOUNTS
  );
};

export const createPaymentAccount = async (data) => {
  if (!data.bankName || !data.accountNumber) {
    throw new AppError('Bank name and account number are required.', 400);
  }

  const newAccount = {
    id: `pa-${Date.now()}`,
    bankName: data.bankName,
    accountName: data.accountName || 'Birrend Platform',
    accountNumber: data.accountNumber,
    instructions: data.instructions || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date(),
  };

  MOCK_PAYMENT_ACCOUNTS.unshift(newAccount);

  return await safeDbQuery(
    () =>
      prisma.paymentAccount.create({
        data: {
          bankName: data.bankName,
          accountName: data.accountName || 'Birrend Platform',
          accountNumber: data.accountNumber,
          instructions: data.instructions || '',
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      }),
    () => newAccount
  );
};

export const updatePaymentAccount = async (id, data) => {
  const account = await safeDbQuery(
    () => prisma.paymentAccount.findUnique({ where: { id } }),
    () => MOCK_PAYMENT_ACCOUNTS.find((acc) => acc.id === id) || null
  );
  if (!account) throw new AppError('Payment account not found.', 404);

  return await safeDbQuery(
    () =>
      prisma.paymentAccount.update({
        where: { id },
        data: {
          ...(data.bankName && { bankName: data.bankName }),
          ...(data.accountName && { accountName: data.accountName }),
          ...(data.accountNumber && { accountNumber: data.accountNumber }),
          ...(data.instructions !== undefined && { instructions: data.instructions }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      }),
    () => {
      Object.assign(account, data);
      return account;
    }
  );
};

export const deletePaymentAccount = async (id) => {
  MOCK_PAYMENT_ACCOUNTS = MOCK_PAYMENT_ACCOUNTS.filter((acc) => acc.id !== id);
  await safeDbQuery(
    () => prisma.paymentAccount.delete({ where: { id } }),
    () => ({ id })
  );
  return { id };
};


// --- DEPOSIT VERIFICATION REQUESTS ---

export const createDepositRequest = async (userId, data) => {
  if (!data.transactionRef || !data.transactionRef.trim()) {
    throw new AppError('Transaction reference number (TxRef / FT Code) is required.', 400);
  }

  const cleanTxRef = data.transactionRef.trim();

  const user = await safeDbQuery(
    () => prisma.user.findUnique({ where: { id: userId } }),
    () => ({ id: userId, name: 'Learner', email: 'learner@birrend.com' })
  );
  if (!user) throw new AppError('User account not found.', 404);

  // 1. Prevent multiple pending deposit requests for the same user
  const existingPending = await safeDbQuery(
    () =>
      prisma.depositRequest.findFirst({
        where: {
          userId,
          status: 'pending',
        },
      }),
    () => MOCK_DEPOSIT_REQUESTS.find((d) => d.userId === userId && d.status === 'pending') || null
  );

  if (existingPending) {
    throw new AppError(
      'You already have a deposit verification request pending review (TxRef: ' +
        existingPending.transactionRef +
        '). Please wait for the admin to verify your request before submitting another.',
      400
    );
  }

  // 2. Prevent duplicate transaction reference numbers (TxRef) from being resubmitted
  const duplicateTx = await safeDbQuery(
    () =>
      prisma.depositRequest.findFirst({
        where: {
          transactionRef: {
            equals: cleanTxRef,
            mode: 'insensitive',
          },
        },
      }),
    () => MOCK_DEPOSIT_REQUESTS.find((d) => d.transactionRef.toLowerCase() === cleanTxRef.toLowerCase()) || null
  );

  if (duplicateTx) {
    throw new AppError(
      `Transaction Reference ID "${cleanTxRef}" has already been submitted on the platform. Please check your receipt or contact support if you believe this is an error.`,
      400
    );
  }

  const amount = parseFloat(data.amount) || 1000.0;

  const depositObj = {
    id: `dep-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    amount,
    paymentChannel: data.paymentChannel || 'CBE',
    accountNumber: data.accountNumber || '',
    transactionRef: cleanTxRef,
    senderPhone: data.senderPhone || '',
    receiptUrl: data.receiptUrl || null,
    status: 'pending',
    requestedAt: new Date(),
  };

  MOCK_DEPOSIT_REQUESTS.unshift(depositObj);

  // Create pending deposit request
  const deposit = await safeDbQuery(
    () =>
      prisma.depositRequest.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          amount,
          paymentChannel: data.paymentChannel || 'CBE',
          accountNumber: data.accountNumber || '',
          transactionRef: cleanTxRef,
          senderPhone: data.senderPhone || '',
          receiptUrl: data.receiptUrl || null,
          status: 'pending',
        },
      }),
    () => depositObj
  );

  // Update user status to PENDING_APPROVAL
  await safeDbQuery(
    () =>
      prisma.user.update({
        where: { id: user.id },
        data: { status: 'PENDING_APPROVAL' },
      }),
    () => null
  );

  return deposit;
};

export const getUserLatestDepositRequest = async (userId) => {
  return await safeDbQuery(
    () =>
      prisma.depositRequest.findFirst({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
      }),
    () =>
      MOCK_DEPOSIT_REQUESTS.filter((d) => d.userId === userId).sort(
        (a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)
      )[0] || null
  );
};

export const getAllDepositRequests = async () => {
  return await safeDbQuery(
    () =>
      prisma.depositRequest.findMany({
        orderBy: { requestedAt: 'desc' },
      }),
    () => MOCK_DEPOSIT_REQUESTS
  );
};

export const processDepositRequest = async (depositId, status, declineReason = null) => {
  const deposit = await prisma.depositRequest.findUnique({ where: { id: depositId } });
  if (!deposit) throw new AppError('Deposit request not found.', 404);

  const normalizedStatus = status.toLowerCase(); // "approved" | "declined"
  if (!['approved', 'declined'].includes(normalizedStatus)) {
    throw new AppError('Invalid status. Use "approved" or "declined".', 400);
  }

  // Atomic Update: Ensure deposit is still pending before changing state
  const updateResult = await prisma.depositRequest.updateMany({
    where: {
      id: depositId,
      status: 'pending',
    },
    data: {
      status: normalizedStatus,
      processedAt: new Date(),
      ...(normalizedStatus === 'declined'
        ? { declineReason: declineReason || 'Transaction reference or payment could not be verified in bank statement.' }
        : {}),
    },
  });

  if (updateResult.count === 0) {
    throw new AppError(`Deposit request has already been ${deposit.status}. Double approval prevented.`, 400);
  }

  const updatedDeposit = await prisma.depositRequest.findUnique({ where: { id: depositId } });

  if (normalizedStatus === 'approved') {
    // 1. Activate user account
    await prisma.user.update({
      where: { id: deposit.userId },
      data: { status: 'ACTIVE', isActive: true },
    });

    // 2. Upsert user wallet & add staked amount (0% platform fee)
    const wallet = await prisma.wallet.findUnique({ where: { userId: deposit.userId } });
    const feeAmount = 0.0;
    const netStake = deposit.amount;

    const wasFreeTrial = wallet ? wallet.isFreeTrial : true;

    if (wallet) {
      await prisma.wallet.update({
        where: { userId: deposit.userId },
        data: {
          stakedAmount: wallet.stakedAmount + netStake,
          totalPlatformFees: wallet.totalPlatformFees + feeAmount,
          isFreeTrial: false,
        },
      });
    } else {
      await prisma.wallet.create({
        data: {
          userId: deposit.userId,
          stakedAmount: netStake,
          totalPlatformFees: feeAmount,
          availableBalance: 0.0,
          isFreeTrial: false,
        },
      });
    }

    // 3. Update user curriculum progress if converting from Free Trial
    if (wasFreeTrial) {
      await prisma.user.update({
        where: { id: deposit.userId },
        data: { currentDay: 1 },
      });
    }

    // 4. Record Ledger Transaction
    await prisma.ledgerTransaction.create({
      data: {
        userId: deposit.userId,
        type: 'MANUAL_DEPOSIT_VERIFIED',
        amount: deposit.amount,
        status: 'COMPLETED',
        description: `Deposit of ${deposit.amount} ETB verified via ${deposit.paymentChannel} (TxRef: ${deposit.transactionRef})`,
        chapaTxRef: deposit.transactionRef,
      },
    });

    return updatedDeposit;
  } else if (normalizedStatus === 'declined') {
    // Set user status to INACTIVE
    await prisma.user.update({
      where: { id: deposit.userId },
      data: { status: 'INACTIVE' },
    });

    return updatedDeposit;
  }
};
