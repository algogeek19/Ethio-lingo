import { useAdminStore } from '../admin.store';

export const useAdmin = () => {
  const learners = useAdminStore((state) => state.learners);
  const searchTerm = useAdminStore((state) => state.searchTerm);
  const setSearchTerm = useAdminStore((state) => state.setSearchTerm);
  const approvePayout = useAdminStore((state) => state.approvePayout);

  const filteredLearners = learners.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    learners: filteredLearners,
    allLearners: learners,
    searchTerm,
    setSearchTerm,
    approvePayout,
  };
};
