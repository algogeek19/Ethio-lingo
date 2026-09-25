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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-hairline/50">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 font-mono text-[10px] tracking-[0.2em] text-primary uppercase font-semibold">
            <span>Financial Vault · Audited Ledger</span>
          </div>
          <h1 className="font-cormorant text-4xl md:text-5xl text-on-surface font-normal tracking-tight">
            Escrow Ledger &amp; Yield Vault
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-1 font-light">
            Audited non-custodial habit staking platform for Ethiopian educational advancement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#wallet-settlement"
            className="px-5 py-2.5 rounded-full bg-surface-container text-on-surface text-xs tracking-wider uppercase font-medium border border-hairline hover:bg-surface-container-high transition-colors flex items-center gap-2"
          >
            <Wallet size={15} />
            <span>Withdraw Yield</span>
          </a>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsDepositModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center gap-2 focus-ring btn-interactive cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>+ Deposit Stake</span>
          </motion.button>
        </div>
      </div>

      {/* Insufficient / Zero Balance Alert */}
      {isBalanceZero && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 bg-warning-amber/15 border border-warning-amber/40 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-warning-amber/20 flex items-center justify-center text-warning-amber shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-cormorant text-xl font-medium text-on-surface">
                Curriculum Paused — Escrow Stake Balance (0 ETB)
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                Your active stake balance is 0 ETB (withdrawn for payout or un-staked). Submit a deposit verification of 1,000 ETB to reactivate daily curriculum tasks.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center gap-2 focus-ring btn-interactive cursor-pointer shrink-0"
          >
            <PlusCircle size={16} />
            <span>Top Up 1,000 ETB Stake</span>
          </button>
        </motion.div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Active Escrow Stake */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Active Escrow Stake
            </span>
            <ShieldCheck size={16} className="text-primary/70 shrink-0" />
          </div>
          <div className="my-4">
            <span className="font-cormorant text-4xl text-primary font-normal tabular-nums">
              {formatETB(wallet.stakedAmount)}
            </span>
            <span className="block font-sans text-xs text-text-muted mt-1">
              Protected escrow vault. Reaches 100% payout upon completing Day 30 + Exam.
            </span>
          </div>
          <span className="font-mono text-[9px] text-primary font-bold tracking-wider uppercase">
            Status: Locked in Protocol
          </span>
        </motion.div>

        {/* Card 2: Cohort Yield Earned */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Cohort Yield Earned
            </span>
            <ArrowRight size={16} className="text-tertiary shrink-0" />
          </div>
          <div className="my-4">
            <span className="font-cormorant text-4xl text-on-surface font-normal tabular-nums">
              {formatETB(wallet.yieldBalance ?? 0)}
            </span>
            <span className="block font-sans text-xs text-text-muted mt-1">
              Yield accrued on your active escrow stake, distributed at graduation.
            </span>
          </div>
          <span className="font-mono text-[9px] text-tertiary font-bold tracking-wider uppercase">
            Distributed at Graduation
          </span>
        </motion.div>

        {/* Card 3: Total Slashed Penalties */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Total Slashed Penalties
            </span>
            <AlertCircle size={16} className="text-error shrink-0" />
          </div>
          <div className="my-4">
            <span className="font-cormorant text-4xl text-error font-normal tabular-nums">
              {formatETB(wallet.totalPenalties)}
            </span>
            <span className="block font-sans text-xs text-text-muted mt-1">
              Exam fail: -25 ETB • Missed day window: -80 ETB.
            </span>
          </div>
          <span className="font-mono text-[9px] text-error font-bold tracking-wider uppercase">
            Contract Deduction Applied
          </span>
        </motion.div>

        {/* Card 4: Audited Platform Fee */}
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Audited Platform Fee
            </span>
            <Wallet size={16} className="text-on-surface-variant shrink-0" />
          </div>
          <div className="my-4">
            <span className="font-cormorant text-4xl text-on-surface font-normal tabular-nums">
              {formatETB(wallet.totalPlatformFees ?? 0)}
            </span>
            <span className="block font-sans text-xs text-text-muted mt-1">
              0% fee on deposits — full stake is locked in your escrow vault.
            </span>
          </div>
          <span className="font-mono text-[9px] text-on-surface-variant font-bold tracking-wider uppercase">
            Maintenance Expense
          </span>
        </motion.div>
      </div>

      {/* CURRICULUM LEVEL COMPLETION & WITHDRAWAL REQUEST SECTION */}
      <div
        id="wallet-settlement"
        className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline/50 pb-4">
          <div>
            <span className="mono-micro-label text-primary mb-2 inline-block">
              Curriculum Level Settlement &amp; Withdrawal
            </span>
            <h2 className="font-cormorant text-3xl md:text-4xl font-normal text-on-surface">
              Withdrawal &amp; Level Advancement Portal
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 font-sans">
              Learners may request withdrawal of their staked money <strong>only after completing Day 30 and passing the Day 30 Exam</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-surface-dark text-warning-amber font-mono text-xs font-bold rounded-full border border-stone-800">
              Current Level: {user.level} (Day {currentModuleDay}/30 {dailyTasks?.exam ? '• Exam Passed ✓' : ''})
            </span>
          </div>
        </div>

        {isDay30ExamPassed ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option A: Request Withdrawal Form / Pending Card */}
            <div className="bg-surface-container-low border border-hairline/60 rounded-2xl p-5 space-y-4">
              <h3 className="font-cormorant text-2xl font-normal text-on-surface flex items-center gap-2">
                <Send size={18} className="text-primary" />
                <span>Request Staked Money Withdrawal</span>
              </h3>

              {hasPendingWithdrawal ? (
                <div className="p-4 bg-warning-amber/15 border border-warning-amber/30 rounded-2xl space-y-3 font-sans">
                  <div className="flex items-center gap-2 text-warning-amber font-bold text-sm font-mono">
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
                  <p className="text-xs text-on-surface-variant font-sans">
                    Submit your Ethiopian bank and Telebirr account details. Platform admins will verify your level completion and transfer <strong>{formatETB(wallet.stakedAmount || 900)}</strong>.
                  </p>

                  {withdrawalMessage && (
                    <div
                      className={`p-3 text-xs rounded-xl font-mono flex items-center gap-2 ${
                        withdrawalMessage.type === 'success'
                          ? 'bg-success-green/15 border border-success-green/30 text-success-green'
                          : 'bg-error/15 border border-error/30 text-destructive-red'
                      }`}
                    >
                      {withdrawalMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{withdrawalMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-on-surface-variant uppercase mb-1 tracking-wider">
                        Bank Name
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline outline-none text-on-surface focus:border-primary transition-colors"
                      >
                        <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                        <option value="Awash Bank">Awash Bank</option>
                        <option value="Dashen Bank">Dashen Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-on-surface-variant uppercase mb-1 tracking-wider">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1000123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline outline-none font-mono text-on-surface focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-semibold text-on-surface-variant uppercase mb-1 tracking-wider">
                        Telebirr Mobile Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0911234567"
                        value={telebirrNumber}
                        onChange={(e) => setTelebirrNumber(e.target.value)}
                        className="w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline outline-none font-mono text-on-surface focus:border-primary transition-colors"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={wallet.stakedAmount <= 0}
                      className="w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 focus-ring btn-interactive cursor-pointer"
                    >
                      <Send size={15} />
                      <span>Submit Withdrawal Request ({formatETB(wallet.stakedAmount || 900)})</span>
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Option B: Continue to Next Level */}
            <div className="bg-surface-container-low border border-hairline/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-cormorant text-2xl font-normal text-on-surface flex items-center gap-2">
                  <ArrowRight size={18} className="text-success-green" />
                  <span>Continue Learning to Next Level</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-sans">
                  Keep your remaining <strong>{formatETB(wallet.stakedAmount || 900)}</strong> staked in escrow and automatically advance to the next curriculum level!
                </p>
                <div className="p-3 bg-success-green/15 border border-success-green/30 rounded-xl text-xs text-success-green font-mono">
                  ✓ Remaining stake will roll over to unlock Day 1 of the next curriculum track!
                </div>
              </div>

              <button
                onClick={handleAdvanceLevel}
                className="w-full py-3 rounded-full bg-surface-dark hover:bg-stone-800 text-stone-100 font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
              >
                <span>Advance to Next Curriculum Level →</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-hairline/60 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-cormorant text-2xl font-normal text-on-surface flex items-center gap-2">
                  <Send size={18} className="text-primary" />
                  <span>Withdraw Staked Money</span>
                </h3>
                <p className="text-xs text-on-surface-variant font-sans">
                  Withdrawal requests unlock upon completing all 30 daily modules of <strong>{user.level}</strong> and passing the Day 30 Exam. You are currently on <strong>Day {currentModuleDay} of 30</strong>.
                </p>
              </div>

              <div className="px-3 py-1.5 bg-surface-dark border border-stone-800 text-stone-300 text-xs font-mono font-semibold rounded-full flex items-center gap-1.5 shrink-0">
                <Lock size={14} className="text-warning-amber" />
                <span>Locked (Day {currentModuleDay}/30 {currentModuleDay >= 30 ? '• Exam Pending' : ''})</span>
              </div>
            </div>

            <button
              disabled
              type="button"
              className="w-full py-3.5 bg-surface-dark border border-stone-700 text-stone-400 font-semibold text-xs rounded-full flex items-center justify-center gap-2 cursor-not-allowed opacity-80 shadow-none"
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
          <div className="space-y-3 border-t border-hairline/50 pt-4">
            <h4 className="font-cormorant text-xl font-normal text-on-surface">
              Your Withdrawal Requests
            </h4>
            <div className="space-y-2">
              {userWithdrawalRequests.map((req) => (
                <div key={req.id} className="p-3 bg-surface-container-low border border-hairline/50 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 font-mono">
                  <div>
                    <span className="font-bold text-on-surface">{req.id}</span> • {req.levelCompleted} Level Completion ({formatETB(req.amount)})
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Bank: {req.bankName} ({req.accountNumber}) | Telebirr: {req.telebirrNumber}
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                      req.status === 'approved'
                        ? 'bg-success-green/15 text-success-green'
                        : req.status === 'declined'
                          ? 'bg-error/15 text-destructive-red'
                          : req.status === 'refunded'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-warning-amber/15 text-warning-amber'
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="mono-micro-label text-primary mb-1 inline-block">Immutable Transaction History</span>
            <h2 className="font-cormorant text-3xl md:text-4xl font-normal text-on-surface">
              Complete Audit &amp; Penalty Ledger
            </h2>
          </div>
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Real-Time Verified Entries</span>
        </div>

        <LedgerTable transactions={ledgerTransactions} />
      </div>

      {/* Chapa Deposit Modal */}
      <ChapaModal isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} />
    </motion.div>
  );
};

export default WalletPage;