import { create } from 'zustand';

export const useWorkspacesStore = create((set) => ({
  activeWorkspace: 'video', // 'video' | 'pdf'
  setActiveWorkspace: (type) => set({ activeWorkspace: type }),
}));
