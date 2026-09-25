import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  Upload,
  FileCheck,
  AlertCircle,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';

const ChapaModal = ({ isOpen, onClose, onDepositSubmitted }) => {
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [transactionRef, setTransactionRef] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  const [existingPending, setExistingPending] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch active bank accounts and existing pending deposit status from API
  useEffect(() => {
    if (!isOpen) return;
    const fetchAccountsAndStatus = async () => {
      try {
        const [accRes, statusRes] = await Promise.all([
          api.getActivePaymentAccounts(),
          api.getMyDepositStatus(),
        ]);

        if (accRes.success && accRes.data) {
          setPaymentAccounts(accRes.data);
          if (accRes.data.length > 0) {
            setSelectedAccount(accRes.data[0]);
          }
        }

        if (statusRes.success && statusRes.data && statusRes.data.status === 'pending') {
          setExistingPending(statusRes.data);
        } else {
          setExistingPending(null);
        }
      } catch (err) {
        console.error('Error loading deposit modal data:', err);
      }
    };

    fetchAccountsAndStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyAccount = (id, number) => {
    navigator.clipboard.writeText(number);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setErrorMsg('Please enter your Bank / Telebirr Transaction Reference ID (FT / TxRef).');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let receiptUrl = null;

      // 1. Upload receipt screenshot via a short-lived signed URL minted
      //    server-side (service-role key). The browser never writes to Storage
      //    directly, so public Storage policies can stay locked down.
      if (receiptFile) {
        try {
          const uploadUrlRes = await api.getReceiptUploadUrl({
            fileName: receiptFile.name,
            fileType: receiptFile.type,
          });

          if (!uploadUrlRes.success || !uploadUrlRes.data) {
            throw new Error((uploadUrlRes.error && uploadUrlRes.error.message) || 'Failed to authorize receipt upload');
          }

          const { path, token, publicUrl } = uploadUrlRes.data;

          const { error: uploadErr } = await supabase.storage
            .from('payment-receipts')
            .uploadToSignedUrl(path, token, receiptFile, {
              contentType: receiptFile.type || 'image/png',
            });

          if (uploadErr) {
            throw new Error(uploadErr.message);
          }

          receiptUrl = publicUrl;
        } catch (uploadErr) {
          // Non-blocking: the deposit is still submitted and can be matched by TxRef.
          console.warn('Receipt upload failed, continuing with TxRef:', uploadErr.message);
        }
      }

      // 2. Submit deposit verification request to backend
      const payload = {
        amount: selectedAmount,
        paymentChannel: selectedAccount?.bankName || 'CBE / Mobile Wallet',
        accountNumber: selectedAccount?.accountNumber || '',
        transactionRef: transactionRef.trim(),
        senderPhone: senderPhone.trim(),
        receiptUrl,
      };

      const res = await api.submitDepositRequest(payload);
      setIsSubmitting(false);

      if (res.success) {
        setIsSubmitted(true);
        if (onDepositSubmitted) onDepositSubmitted(res.data);
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Deposit verification submission failed. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapa-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-surface-container-lowest border border-hairline rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors duration-250">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-hairline/50 mb-5">
          <div>
            <span className="mono-micro-label text-primary mb-1 inline-block">
              Chapa Verified Deposit
            </span>
            <h3 id="chapa-modal-title" className="font-cormorant text-2xl font-normal text-on-surface">
              Bank &amp; Wallet Stake Deposit
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 font-sans">Direct Ethiopian Bank Transfer &amp; Verification</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close deposit dialog"
            className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-card transition-colors focus-ring shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-success-green/20 text-success-green rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={38} />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h4 className="font-cormorant text-2xl font-normal text-on-surface">Deposit Request Submitted!</h4>
              <p className="text-xs text-on-surface-variant font-sans">
                Thank you! Your transaction reference number <strong className="font-mono text-primary">{transactionRef}</strong> has been sent to our finance admin queue.
              </p>
              <div className="p-3 bg-warning-amber/15 border border-warning-amber/30 rounded-xl text-xs text-warning-amber font-mono flex items-center gap-2 text-left">
                <Clock size={18} className="text-warning-amber shrink-0" />
                <span>
                  <strong>Admin Verification Notice:</strong> Admin will verify your transaction reference <strong>within 24 hours</strong>.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm focus-ring btn-interactive transition-all"
            >
              Done &amp; Return to Workspace
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-error/15 border border-error/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {existingPending && (
              <div className="p-3.5 bg-warning-amber/15 border border-warning-amber/30 rounded-xl text-xs text-warning-amber space-y-1 font-mono">
                <div className="flex items-center gap-2 font-bold">
                  <Clock size={16} className="text-warning-amber shrink-0" />
                  <span>Pending Deposit Request Under Review</span>
                </div>
                <p className="text-[11px] leading-snug font-sans text-on-surface-variant">
                  You already submitted deposit reference <strong className="font-mono text-primary">{existingPending.transactionRef}</strong>. The admin is verifying your payment within 24 hours. You cannot submit another request until your pending request is processed.
                </p>
              </div>
            )}

            {/* Step 1: Fixed Deposit Amount (1,000 ETB) */}
            <div className="p-4 bg-surface-dark border border-stone-800 rounded-2xl space-y-1 font-mono">
              <span className="mono-micro-label text-warning-amber font-bold block">
                1. Fixed Required Stake Deposit Amount
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="font-cormorant text-3xl font-normal text-stone-100">1,000.00 ETB</span>
                <span className="px-2.5 py-1 bg-primary/20 border border-primary text-primary text-[10px] font-mono rounded-full uppercase tracking-wider shrink-0">
                  Standard Stake
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-sans pt-1">
                0% platform service fee; the full <strong>1,000 ETB stake</strong> is locked to guarantee your 30-day learning commitment.
              </p>
            </div>

            {/* Step 2: Payment Account Details */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                2. Official Payment Accounts (Click to Copy Account No.)
              </label>
              <div className="space-y-2">
                {paymentAccounts.map((acc) => {
                  const isSelected = selectedAccount?.id === acc.id;
                  const isCopied = copiedId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between focus-ring ${
                        isSelected
                          ? 'bg-surface-container-low border-primary shadow-sm'
                          : 'bg-surface-container-lowest border-hairline hover:border-primary'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-cormorant text-base font-medium text-on-surface">{acc.bankName}</span>
                          <span className="text-[10px] font-mono text-text-muted">({acc.accountName})</span>
                        </div>
                        <p className="font-mono text-sm font-bold text-primary tracking-wide">
                          {acc.accountNumber}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAccount(acc.id, acc.accountNumber);
                        }}
                        aria-label={`Copy ${acc.bankName} account number`}
                        className="px-2.5 py-1 bg-surface-container-low border border-hairline hover:border-primary text-xs font-mono rounded-full flex items-center gap-1 text-on-surface-variant focus-ring"
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} className="text-success-green" />
                            <span className="text-success-green font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Input TxRef & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Transaction Ref ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. FT24080512345 or Telebirr ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline outline-none font-mono text-on-surface focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Phone/Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09123456789"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline outline-none font-mono text-on-surface focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Step 4: Receipt Screenshot Upload (Optional) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                Attach Bank / Telebirr Receipt Screenshot (Optional)
              </label>
              <div className="relative border-2 border-dashed border-hairline hover:border-primary bg-surface-container-low rounded-xl p-3 transition-colors text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {receiptFile ? (
                  <div className="flex items-center justify-between text-left text-xs font-mono text-primary">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck size={18} className="text-success-green shrink-0" />
                      <span className="truncate font-semibold">{receiptFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceiptFile(null);
                      }}
                      className="text-destructive-red hover:underline text-[10px] font-sans font-bold px-2 py-0.5 border border-destructive-red/30 rounded-full"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-on-surface-variant">
                    <Upload size={18} className="text-primary" />
                    <span className="text-xs font-medium font-sans">Click to Attach Receipt Screenshot</span>
                    <span className="text-[10px] text-text-muted font-mono">PNG, JPG, or PDF</span>
                  </div>
                )}
              </div>
            </div>

            {/* 30-Day Escrow Note */}
            <div className="p-3 bg-surface-dark border border-stone-800 text-stone-300 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-warning-amber font-mono">
                <ShieldCheck size={14} />
                <span>Zero Gateway Fee Verification</span>
              </div>
              <p className="text-stone-400 leading-snug font-sans">
                Your ETB deposit is verified directly by the admin without payment gateway surcharges.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !transactionRef.trim() || !!existingPending}
              className="w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-mono focus-ring btn-interactive cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting Deposit...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Deposit Verification ({formatETB(selectedAmount)})</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChapaModal;