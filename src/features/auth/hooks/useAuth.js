import { useAuthStore } from '../auth.store';

export const useAuth = () => {
  const role = useAuthStore((state) => state.role);
  const toggleRole = useAuthStore((state) => state.toggleRole);
  const setRole = useAuthStore((state) => state.setRole);
  const user = useAuthStore((state) => state.user);

  return {
    role,
    toggleRole,
    setRole,
    user,
  };
};
