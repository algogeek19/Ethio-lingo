import { useWalletStore } from '../wallet.store';

export const useWallet = () => {
  const wallet = useWalletStore((state) => state.wallet);
  const streak = useWalletStore((state) => state.streak);
  const cycleEndDate = useWalletStore((state) => state.cycleEndDate);
  const ledgerTransactions = useWalletStore((state) => state.ledgerTransactions);
  const addDeposit = useWalletStore((state) => state.addDeposit);
  const submitExamResult = useWalletStore((state) => state.submitExamResult);

  return {
    wallet,
    streak,
    cycleEndDate,
    ledgerTransactions,
    addDeposit,
    submitExamResult,
  };
};
