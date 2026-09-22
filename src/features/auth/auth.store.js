import { create } from 'zustand';
import { INITIAL_USER } from '../../shared/constants';

export const useAuthStore = create((set) => ({
  role: 'learner', // 'learner' | 'admin'
  user: INITIAL_USER,
  isAuthenticated: true,
  
  toggleRole: () => set((state) => ({ role: state.role === 'learner' ? 'admin' : 'learner' })),
  setRole: (role) => set({ role }),
  setUser: (user) => set({ user }),
}));
