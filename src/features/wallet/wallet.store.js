import { create } from 'zustand';

export const useWalletStore = create((set, get) => ({
  wallet: {
    stakedAmount: 1500,
    availableBalance: 450,
    escrowStatus: 'ACTIVE_LOCKED',
    penaltyRate: 25,
    totalEarned: 2400,
    totalPenalties: 100,
  },
  streak: {
    count: 18,
    lastCompleted: '2026-07-29',
    dueToday: true,
  },
  cycleEndDate: (() => {
    const end = new Date();
    end.setDate(end.getDate() + 14);
    return end.toISOString();
  })(),
  ledgerTransactions: [
    {
      id: 'TX-9021',
      date: '2026-07-29T09:30:00Z',
      type: 'STAKE_RETENTION',
      description: 'Daily Exam Passed (100% Score) - Microeconomics 301',
      amount: 0.0,
      status: 'SUCCESS',
    },
    {
      id: 'TX-8977',
      date: '2026-07-26T23:59:00Z',
      type: 'PENALTY_DEDUCTION',
      description: 'Missed Daily Assessment Window #12',
      amount: -50.0,
      status: 'PENALTY',
    },
    {
      id: 'TX-8840',
      date: '2026-07-15T14:20:00Z',
      type: 'CHAPA_DEPOSIT',
      description: 'Chapa Pay Deposit - Locked 30-Day Stake',
      amount: +1500.0,
      status: 'COMPLETED',
    },
  ],

  addDeposit: (amount) => {
    const newTx = {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      type: 'CHAPA_DEPOSIT',
      description: `Chapa ETB Deposit - Stake Refill`,
      amount: +amount,
      status: 'COMPLETED',
    };

    set((state) => ({
      wallet: {
        ...state.wallet,
        stakedAmount: state.wallet.stakedAmount + amount,
        availableBalance: state.wallet.availableBalance + amount,
      },
      ledgerTransactions: [newTx, ...state.ledgerTransactions],
    }));
  },

  submitExamResult: (score, passed) => {
    const { wallet } = get();

    if (passed) {
      const newTx = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        type: 'STAKE_RETENTION',
        description: `Daily Exam Passed (${score}%) - Stake Protected`,
        amount: 0.0,
        status: 'SUCCESS',
      };

      set((state) => ({
        streak: {
          ...state.streak,
          count: state.streak.dueToday ? state.streak.count + 1 : state.streak.count,
          lastCompleted: new Date().toISOString().split('T')[0],
          dueToday: false,
        },
        ledgerTransactions: [newTx, ...state.ledgerTransactions],
      }));
    } else {
      const penalty = wallet.penaltyRate;
      const newTx = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString(),
        type: 'PENALTY_DEDUCTION',
        description: `Exam Failed (${score}%) - Penalty Applied`,
        amount: -penalty,
        status: 'PENALTY',
      };

      set((state) => ({
        wallet: {
          ...state.wallet,
          stakedAmount: Math.max(0, state.wallet.stakedAmount - penalty),
          totalPenalties: state.wallet.totalPenalties + penalty,
        },
        ledgerTransactions: [newTx, ...state.ledgerTransactions],
      }));
    }
  },
}));
