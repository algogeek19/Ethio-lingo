import { create } from 'zustand';

const sampleQuestions = [
  {
    id: 1,
    question: 'Under Ethiopian Commercial Code Article 418, what is the mandatory minimum lock period for an escrow stake vault?',
    options: ['14 Calendar Days', '30 Calendar Days', '60 Calendar Days', '90 Calendar Days'],
    correctAnswer: 1,
  },
  {
    id: 2,
    question: 'In dynamic econometrics, how does an increase in central bank reserve ratios impact private liquidity velocity?',
    options: [
      'Increases velocity exponentially',
      'Decreases money supply multiplier and liquidity velocity',
      'Has zero statistical correlation',
      'Inverts foreign exchange rate parity',
    ],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: 'What happens to a learner’s ETB stake when a daily exam window expires without submission?',
    options: [
      'Entire stake is immediately deleted',
      'Stake is frozen permanently',
      'Standard penalty rate (e.g. ETB 50) is deducted into the pool vault',
      'No effect occurs',
    ],
    correctAnswer: 2,
  },
];

export const useExamStore = create((set) => ({
  questions: sampleQuestions,
  currentIdx: 0,
  answers: {},
  timerSeconds: 300,
  isSubmitted: false,
  result: null,

  setAnswer: (questionIdx, optionIdx) =>
    set((state) => ({ answers: { ...state.answers, [questionIdx]: optionIdx } })),

  setCurrentIdx: (idx) => set({ currentIdx: idx }),

  setTimerSeconds: (secs) => set({ timerSeconds: secs }),

  setSubmittedResult: (result) => set({ isSubmitted: true, result }),

  resetExam: () =>
    set({
      currentIdx: 0,
      answers: {},
      timerSeconds: 300,
      isSubmitted: false,
      result: null,
    }),
}));
