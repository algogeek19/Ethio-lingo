import { useWorkspacesStore } from '../workspaces.store';

export const useWorkspaces = () => {
  const activeWorkspace = useWorkspacesStore((state) => state.activeWorkspace);
  const setActiveWorkspace = useWorkspacesStore((state) => state.setActiveWorkspace);

  return {
    activeWorkspace,
    setActiveWorkspace,
  };
};
