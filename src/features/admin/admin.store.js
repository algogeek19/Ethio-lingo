import { create } from 'zustand';

const initialLearners = [
  { id: 'L-101', name: 'Abebe Kebede', email: 'abebe.k@birrend.edu.et', stake: 1500, streak: 18, status: 'ACTIVE', cycleDay: 16 },
  { id: 'L-102', name: 'Tigist Assefa', email: 'tigist.a@birrend.edu.et', stake: 3000, streak: 29, status: 'PENDING_PAYOUT', cycleDay: 30 },
  { id: 'L-103', name: 'Dawit Yohannes', email: 'dawit.y@birrend.edu.et', stake: 500, streak: 2, status: 'AT_RISK', cycleDay: 8 },
  { id: 'L-104', name: 'Marta Tadesse', email: 'marta.t@birrend.edu.et', stake: 1500, streak: 24, status: 'ACTIVE', cycleDay: 22 },
  { id: 'L-105', name: 'Sileshi Bekele', email: 'sileshi.b@birrend.edu.et', stake: 3000, streak: 30, status: 'COMPLETED_RELEASED', cycleDay: 30 },
];

export const useAdminStore = create((set) => ({
  learners: initialLearners,
  searchTerm: '',
  setSearchTerm: (term) => set({ searchTerm: term }),

  approvePayout: (id) =>
    set((state) => ({
      learners: state.learners.map((l) =>
        l.id === id ? { ...l, status: 'COMPLETED_RELEASED' } : l
      ),
    })),
}));
