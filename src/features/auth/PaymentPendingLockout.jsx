import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Lock,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Send,
  LogOut,
  Wallet,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatETB } from '../../utils/formatters';
import ChapaModal from '../wallet/ChapaModal';

const cardClass = 'max-w-xl w-full bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden';
const statusBadgeClass = 'inline-block px-3 py-1 font-mono text-[10px] font-bold rounded uppercase tracking-wider';
const primaryButtonClass = 'w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer';
const secondaryButtonClass = 'w-full py-3 rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high text-xs tracking-wider uppercase font-semibold flex items-center justify-center gap-2 shadow-sm transition-all focus-ring cursor-pointer';

const PaymentPendingLockout = ({ user, onStatusRefresh, onLogout }) => {
  const [depositStatus, setDepositStatus] = useState(null);
  const [userWallet, setUserWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState(null);

  const fetchLockoutData = async () => {
    setLoading(true);
    try {
      const [depRes, walletRes] = await Promise.all([
        api.getMyDepositStatus(),
        api.getWallet(),
      ]);

      if (depRes.success && depRes.data) {
        setDepositStatus(depRes.data);
      }
      if (walletRes.success && walletRes.data) {
        setUserWallet(walletRes.data);
      }
    } catch (err) {
      console.error('Error fetching lockout status data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    await fetchLockoutData();
    if (onStatusRefresh) onStatusRefresh();
    setRefreshNotice('Status Checked: Your deposit request is under admin review.');
    setTimeout(() => setRefreshNotice(null), 5000);
  };

  useEffect(() => {
    const initLockout = async () => {
      await fetchLockoutData();
    };
    initLockout();
  }, []);

  // Auto-open deposit modal for direct staked users with no deposit request submitted yet
  useEffect(() => {
    if (!loading && userWallet && !userWallet.isFreeTrial && (userWallet.stakedAmount ?? 0) <= 0 && (!depositStatus || depositStatus.status === 'none')) {
      setShowDepositModal(true);
    }
  }, [loading, userWallet, depositStatus]);

  // Determine specific lockout reason category
  const isPendingApproval = depositStatus?.status === 'pending' || user?.status === 'PENDING_APPROVAL';
  const isDeclined = depositStatus?.status === 'declined';
  const isTrialExpired = userWallet?.isFreeTrial && (userWallet?.freeTrialDaysLeft ?? 0) <= 0;
  const isLowStake = (userWallet?.stakedAmount ?? 0) < 500 && (userWallet?.stakedAmount ?? 0) > 0 && !isPendingApproval;
  const hasNoStake = (userWallet?.stakedAmount ?? 0) <= 0 && !isPendingApproval && !isDeclined;

  // Defensive: unverified emails must go through the /verify flow, not the deposit flow.
  if (user && user.emailVerified === false) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className={cardClass}>
          <div className="text-center space-y-3 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-surface-low border border-hairline/60 flex items-center justify-center mx-auto text-primary shadow-sm">
              <MailCheck size={32} className="text-primary" />
            </div>
            <div className={`${statusBadgeClass} bg-warning-amber/10 text-warning-amber`}>
              EMAIL NOT VERIFIED
            </div>
            <h2 className="font-cormorant text-3xl font-normal text-on-surface">
              Verify your Google email first
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
              You must verify the Google email on your account before daily learning,
              exams, or the escrow wallet can be unlocked.
            </p>
          </div>

          <div className="p-4 bg-surface-soft border border-hairline rounded-xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-primary">
              <ShieldCheck size={16} />
              <span>Google-verified accounts only</span>
            </div>
            <p className="text-on-surface-variant text-[11px] leading-relaxed break-all">
              Account: <strong className="font-mono">{user.email}</strong>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/verify"
              className={primaryButtonClass}
            >
              <ShieldCheck size={16} />
              <span>Go to Email Verification</span>
            </Link>

            <div className="flex justify-between items-center text-xs font-mono pt-2">
              <span className="text-text-muted">Logged in as: {user.email}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-destructive-red hover:text-error font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className={cardClass}>
        {/* Lockout Reason Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-surface-low border border-hairline/60 flex items-center justify-center mx-auto text-primary shadow-sm">
            {isPendingApproval ? (
              <Clock size={32} className="text-warning-amber animate-pulse" />
            ) : isTrialExpired ? (
              <Sparkles size={32} className="text-primary" />
            ) : isLowStake ? (
              <AlertTriangle size={32} className="text-destructive-red" />
            ) : (
              <Lock size={32} className="text-primary" />
            )}
          </div>

          {/* Status Badge */}
          <div
            className={`${statusBadgeClass} ${
              isPendingApproval
                ? 'bg-warning-amber/10 text-warning-amber'
                : isDeclined || isLowStake || hasNoStake
                ? 'bg-error/10 text-error'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {isPendingApproval
              ? 'AWAITING ADMIN APPROVAL'
              : isTrialExpired
              ? '7-DAY FREE TRIAL ENDED'
              : isLowStake
              ? 'LOW STAKE - ACCOUNT DEACTIVATED'
              : isDeclined
              ? 'PAYMENT VERIFICATION DECLINED'
              : 'STAKE DEPOSIT REQUIRED (0 ETB STAKED)'}
          </div>

          {/* Title */}
          <h2 className="font-cormorant text-3xl font-normal text-on-surface">
            {isPendingApproval
              ? 'Your Deposit is Under Review'
              : isTrialExpired
              ? 'Free Trial Period Finished'
              : isLowStake
              ? 'Insufficient Escrow Vault Stake'
              : isDeclined
              ? 'Payment Verification Declined'
              : 'Deposit Stake to Unlock Learning'}
          </h2>

          {/* Detailed Message */}
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
            {isPendingApproval ? (
              <>
                Deposit submitted! Admin will verify your transaction reference within <strong>24 hours</strong> to activate your account and credit your escrow vault.
              </>
            ) : isTrialExpired ? (
              <>
                Your 3-day free trial has concluded! Deposit your 1,000 ETB escrow stake to continue daily learning modules, listening and video practice, and diagnostic exams.
              </>
            ) : isLowStake ? (
              <>
                Your staked balance is <strong>{formatETB(userWallet?.stakedAmount ?? 0)}</strong>, which is below the minimum required 500 ETB threshold due to penalties. Please top up your stake to reactivate your account.
              </>
            ) : isDeclined ? (
              <>
                Your recent payment verification request was declined. Reason: <em>"{depositStatus?.declineReason || 'Transaction reference not found in bank statement'}"</em>. Please submit a new deposit request.
              </>
            ) : (
              <>
                Your staked amount is currently <strong>0 ETB</strong>. Submit your bank or Telebirr transfer reference to activate your account and start your 30-day learning curriculum.
              </>
            )}
          </p>
        </div>

        {/* Current Wallet & Deposit Card */}
        <div className="p-4 bg-surface-low border border-hairline rounded-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-hairline/50 pb-2">
            <span className="text-text-muted uppercase font-bold text-[10px] flex items-center gap-1.5">
              <Wallet size={14} className="text-primary" />
              <span>CURRENT ACCOUNT STATUS SUMMARY</span>
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                isPendingApproval
                  ? 'bg-warning-amber/10 text-warning-amber border border-warning-amber/30'
                  : isDeclined || isLowStake || hasNoStake
                  ? 'bg-error/10 text-error border border-error/30'
                  : 'bg-surface-container text-on-surface-variant border border-hairline'
              }`}
            >
              {isPendingApproval
                ? 'PENDING APPROVAL'
                : isDeclined
                ? 'DECLINED'
                : isLowStake
                ? 'LOW STAKE'
                : 'NO STAKE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-on-surface">
            <div>
              <span className="text-[10px] text-text-muted block">Staked Vault Balance</span>
              <strong className="text-base font-bold text-primary">
                {formatETB(userWallet?.stakedAmount ?? 0)}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Account Status</span>
              <strong className="uppercase">{user?.status || 'PENDING_APPROVAL'}</strong>
            </div>

            {depositStatus && (
              <>
                <div className="col-span-2 pt-2 border-t border-hairline grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-text-muted block">Last Submitted TxRef</span>
                    <strong className="text-primary break-all">{depositStatus.transactionRef}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block">Payment Channel</span>
                    <strong>{depositStatus.paymentChannel}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 24-Hour Guarantee Notice */}
        <div className="p-4 bg-surface-soft border border-hairline rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Clock size={16} />
            <span>Admin Payment Verification Guarantee</span>
          </div>
          <p className="text-on-surface-variant text-[11px] leading-relaxed">
            Finance admins verify bank statements and SMS transaction records continuously. Once your payment reference is approved, your account will instantly unlock.
          </p>
        </div>

        {refreshNotice && (
          <div className="p-3 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green font-medium animate-fade-in flex items-center justify-between">
            <span>{refreshNotice}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className={secondaryButtonClass}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Check / Refresh Verification Status</span>
            </button>

            <button
              onClick={() => setShowDepositModal(true)}
              className={primaryButtonClass}
            >
              <Send size={16} />
              <span>{isPendingApproval ? 'Update / Resubmit TxRef' : 'Submit Stake Deposit Verification'}</span>
            </button>
          </div>

          <div className="flex justify-between items-center text-xs font-mono pt-2">
            <span className="text-text-muted">Logged in as: {user?.email}</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-destructive-red hover:text-error font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Deposit Verification Modal */}
        <ChapaModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onDepositSubmitted={() => {
            fetchLockoutData();
            if (onStatusRefresh) onStatusRefresh();
          }}
        />
      </div>
    </div>
  );
};

export default PaymentPendingLockout;