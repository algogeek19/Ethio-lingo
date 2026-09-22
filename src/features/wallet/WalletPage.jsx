import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ShieldCheck,
  PlusCircle,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
} from 'lucide-react';
import { useStaking } from '../../context/StakingContext';
import { formatETB } from '../../utils/formatters';
import LedgerTable from './components/LedgerTable';
import ChapaModal from './ChapaModal';

const WalletPage = () => {
  const {
    wallet,
    user,
    currentModuleDay,
    dailyTasks,
    withdrawalRequests,
    requestWithdrawal,
    advanceToNextLevel,
    ledgerTransactions,
    isBalanceZero,
  } = useStaking();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // Withdrawal form state
  const [bankName, setBankName] = useState('Commercial Bank of Ethiopia (CBE)');
  const [accountNumber, setAccountNumber] = useState('');
  const [telebirrNumber, setTelebirrNumber] = useState('');
  const [withdrawalMessage, setWithdrawalMessage] = useState(null);

  const isDay30ExamPassed = currentModuleDay >= 30 && dailyTasks?.exam === true;
  const userWithdrawalRequests = withdrawalRequests.filter(
    (r) => r.userEmail === user.email || r.userName === user.name
  );
  const pendingWithdrawal = userWithdrawalRequests.find((r) => r.status === 'pending');
  const hasPendingWithdrawal = !!pendingWithdrawal;

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    if (!accountNumber || !telebirrNumber) {
      setWithdrawalMessage({ type: 'error', text: 'Please fill in both Bank Account Number and Telebirr Number.' });
      return;
    }

    const withdrawAmount = wallet?.stakedAmount && wallet.stakedAmount > 0 ? wallet.stakedAmount : 900.0;

    const res = await requestWithdrawal({
      levelCompleted: user?.level || 'Beginner I',
      amount: withdrawAmount,
      bankName,
      accountNumber,
      telebirrNumber,
    });

    if (res.success) {
      setWithdrawalMessage({
        type: 'success',
        text: `Withdrawal request for ${formatETB(withdrawAmount)} submitted! Admin will review and process payout manually.`,
      });
      setAccountNumber('');
      setTelebirrNumber('');
    } else {
      setWithdrawalMessage({ type: 'error', text: res.message || 'Withdrawal request failed. Please check form details.' });
    }
  };

  const handleAdvanceLevel = () => {
    const res = advanceToNextLevel();
    if (res.success) {
      setWithdrawalMessage({
        type: 'success',
        text: `🎉 Upgraded to ${res.nextLevel}! Day 1 unlocked with your rolled-over stake balance.`,
      });
    } else {
      setWithdrawalMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors duration-250"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <span className="text-xs font-mono text-primary-coral uppercase tracking-wider font-semibold">
            Escrow Wallet & Financial Ledger
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-1 tracking-tight">
            Escrow Staking & Payout Controls
          </h1>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsDepositModalOpen(true)}
          className="px-5 py-2.5 bg-primary-coral hover:bg-primary-hover text-white font-semibold rounded-xl shadow-xs transition-all text-xs flex items-center gap-2 focus-ring btn-interactive cursor-pointer"
        >
          <PlusCircle size={16} />
          <span>Top Up Stake Deposit</span>
        </motion.button>
      </div>

      {/* Insufficient / Zero Balance Alert */}
      {isBalanceZero && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-amber-900 dark:text-amber-200">
                Curriculum Paused — Escrow Stake Balance (0 ETB)
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                Your active stake balance is 0 ETB (withdrawn for payout or un-staked). Submit a deposit verification of 1,000 ETB to reactivate daily curriculum tasks.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="px-4 py-2.5 bg-primary-coral hover:bg-primary-hover text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer shrink-0"
          >
            <PlusCircle size={16} />
            <span>Top Up 1,000 ETB Stake</span>
          </button>
        </motion.div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Locked Stake */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
            <span className="font-bold uppercase">Active Locked Escrow</span>
            <ShieldCheck size={20} className="text-primary-coral" />
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
            {formatETB(wallet.stakedAmount)}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Protected escrow vault. Reaches 100% payout upon completing Day 30 + Exam.
          </p>
        </motion.div>

        {/* Card 2: Cumulative Penalties */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
            <span className="font-bold text-destructive-red uppercase">Slashed Penalties</span>
            <AlertCircle size={20} className="text-destructive-red" />
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-bold text-destructive-red tracking-tight">
            {formatETB(wallet.totalPenalties)}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Exam fail: -25 ETB • Missed day window: -80 ETB.
          </p>
        </motion.div>

        {/* Card 3: Platform Service Fees */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
            <span className="font-bold uppercase">Platform Service Fees</span>
            <Wallet size={20} className="text-primary-coral" />
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
            {formatETB(wallet.totalPlatformFees ?? 0)}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            0% fee on deposits — full stake is locked in your escrow vault.
          </p>
        </motion.div>
      </div>

      {/* CURRICULUM LEVEL COMPLETION & WITHDRAWAL REQUEST SECTION */}
      <div className="bg-surface-lowest border-2 border-primary-coral/30 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <span className="text-xs font-mono text-primary-coral uppercase tracking-wider font-semibold">
              CURRICULUM LEVEL SETTLEMENT & WITHDRAWAL
            </span>
            <h2 className="font-serif font-bold text-2xl text-on-surface mt-0.5">
              Withdrawal & Level Advancement Portal
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Learners may request withdrawal of their staked money <strong>only after completing Day 30 and passing the Day 30 Exam</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-surface-dark text-warning-amber font-mono text-xs font-bold rounded-xl border border-stone-800">
              Current Level: {user.level} (Day {currentModuleDay}/30 {dailyTasks?.exam ? '• Exam Passed ✓' : ''})
            </span>
          </div>
        </div>

        {isDay30ExamPassed ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option A: Request Withdrawal Form / Pending Card */}
            <div className="bg-canvas border border-hairline rounded-xl p-5 space-y-4">
              <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                <Send size={18} className="text-primary-coral" />
                <span>Request Staked Money Withdrawal</span>
              </h3>

              {hasPendingWithdrawal ? (
                <div className="p-4 bg-amber-500/15 border-2 border-amber-500/30 rounded-xl space-y-3 font-sans">
                  <div className="flex items-center gap-2 text-warning-amber font-bold text-sm">
                    <Clock size={18} className="animate-pulse" />
                    <span>Withdrawal Request Pending Admin Processing</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    You have submitted a withdrawal request for <strong>{formatETB(pendingWithdrawal.amount || wallet.stakedAmount || 900)}</strong> to <strong>{pendingWithdrawal.bankName}</strong> ({pendingWithdrawal.accountNumber}). Our admin team will verify and transfer your payout within 24 hours.
                  </p>
                  <div className="p-2.5 bg-surface-dark text-stone-300 font-mono text-[11px] rounded-lg border border-stone-800">
                    ID: {pendingWithdrawal.id} • Status: PENDING VERIFICATION
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-on-surface-variant">
                    Submit your Ethiopian bank and Telebirr account details. Platform admins will verify your level completion and transfer <strong>{formatETB(wallet.stakedAmount || 900)}</strong>.
                  </p>

                  {withdrawalMessage && (
                    <div
                      className={`p-3 text-xs rounded-xl font-mono flex items-center gap-2 ${
                        withdrawalMessage.type === 'success'
                          ? 'bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-300'
                          : 'bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {withdrawalMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{withdrawalMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-on-surface-variant uppercase mb-1">
                        Bank Name
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-sans text-on-surface focus-ring"
                      >
                        <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                        <option value="Awash Bank">Awash Bank</option>
                        <option value="Dashen Bank">Dashen Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-on-surface-variant uppercase mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1000123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-on-surface-variant uppercase mb-1">
                        Telebirr Mobile Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0911234567"
                        value={telebirrNumber}
                        onChange={(e) => setTelebirrNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={wallet.stakedAmount <= 0}
                      className="w-full py-3 bg-primary-coral hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
                    >
                      <Send size={15} />
                      <span>Submit Withdrawal Request ({formatETB(wallet.stakedAmount || 900)})</span>
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Option B: Continue to Next Level */}
            <div className="bg-canvas border border-hairline rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                  <ArrowRight size={18} className="text-success-green" />
                  <span>Continue Learning to Next Level</span>
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Keep your remaining <strong>{formatETB(wallet.stakedAmount || 900)}</strong> staked in escrow and automatically advance to the next curriculum level!
                </p>
                <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-700 dark:text-green-300 font-mono">
                  ✓ Remaining stake will roll over to unlock Day 1 of the next curriculum track!
                </div>
              </div>

              <button
                onClick={handleAdvanceLevel}
                className="w-full py-3 bg-surface-dark hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
              >
                <span>Advance to Next Curriculum Level →</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-canvas border border-hairline rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                  <Send size={18} className="text-primary-coral" />
                  <span>Withdraw Staked Money</span>
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Withdrawal requests unlock upon completing all 30 daily modules of <strong>{user.level}</strong> and passing the Day 30 Exam. You are currently on <strong>Day {currentModuleDay} of 30</strong>.
                </p>
              </div>

              <div className="px-3 py-1.5 bg-surface-dark border border-stone-800 text-stone-300 text-xs font-mono font-semibold rounded-xl flex items-center gap-1.5 shrink-0">
                <Lock size={14} className="text-warning-amber" />
                <span>Locked (Day {currentModuleDay}/30 {currentModuleDay >= 30 ? '• Exam Pending' : ''})</span>
              </div>
            </div>

            <button
              disabled
              type="button"
              className="w-full py-3.5 bg-stone-800/80 border border-stone-700 text-stone-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80 shadow-none"
            >
              <Lock size={15} className="text-warning-amber" />
              <span>
                {currentModuleDay >= 30
                  ? 'Withdrawal Deactivated • Complete & Pass Day 30 Exam to Unlock'
                  : 'Withdrawal Deactivated • Complete 30-Day Curriculum & Pass Exam to Unlock'}
              </span>
            </button>
          </div>
        )}

        {/* Existing Withdrawal Requests Status Log */}
        {userWithdrawalRequests.length > 0 && (
          <div className="space-y-3 border-t border-hairline pt-4">
            <h4 className="font-serif font-bold text-sm text-on-surface">Your Withdrawal Requests</h4>
            <div className="space-y-2">
              {userWithdrawalRequests.map((req) => (
                <div key={req.id} className="p-3 bg-canvas border border-hairline rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 font-mono">
                  <div>
                    <span className="font-bold text-on-surface">{req.id}</span> • {req.levelCompleted} Level Completion ({formatETB(req.amount)})
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Bank: {req.bankName} ({req.accountNumber}) | Telebirr: {req.telebirrNumber}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${
                      req.status === 'approved'
                        ? 'bg-green-500/20 text-success-green'
                        : req.status === 'declined'
                          ? 'bg-red-500/20 text-destructive-red'
                          : req.status === 'refunded'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-warning-amber'
                    }`}
                  >
                    {req.status === 'approved' && <CheckCircle2 size={12} />}
                    {req.status === 'declined' && <XCircle size={12} />}
                    {req.status === 'pending' && <Clock size={12} />}
                    <span>Status: {req.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Itemized Audit Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-2xl text-on-surface">
            Complete Audit & Penalty Ledger
          </h2>
          <span className="text-xs font-mono text-text-muted">Immutable Transaction History</span>
        </div>

        <LedgerTable transactions={ledgerTransactions} />
      </div>

      {/* Chapa Deposit Modal */}
      <ChapaModal isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} />
    </motion.div>
  );
};

export default WalletPage;
