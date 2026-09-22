import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Eye,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatETB } from '../../utils/formatters';

const AdminPaymentManagement = () => {
  const [activeTab, setActiveTab] = useState('deposits'); // 'deposits' | 'accounts'

  // Deposit Requests State
  const [deposits, setDeposits] = useState([]);
  const [depositFilter, setDepositFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'declined'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals State
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState(null);
  const [approveModalData, setApproveModalData] = useState(null);
  const [declineModalData, setDeclineModalData] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [deleteAccountModalData, setDeleteAccountModalData] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Payment Accounts (Bank CRUD) State
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [accountFormData, setAccountFormData] = useState({
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    accountName: 'Ethio-Lingo Platform',
    accountNumber: '',
    instructions: '',
    isActive: true,
  });

  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Fetch deposits & payment accounts
  const loadData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [depositsRes, accountsRes] = await Promise.all([
        api.getAllDepositRequests(),
        api.getAllPaymentAccounts(),
      ]);

      if (depositsRes.success && depositsRes.data) {
        setDeposits(depositsRes.data);
      }
      if (accountsRes.success && accountsRes.data) {
        setPaymentAccounts(accountsRes.data);
      }
    } catch (err) {
      console.error('Error fetching payment admin data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // --- DEPOSIT APPROVAL HANDLERS ---
  const handleConfirmApproveDeposit = async () => {
    if (!approveModalData) return;
    const depositId = approveModalData.id;
    setProcessingId(depositId);
    try {
      const res = await api.processDepositStatus(depositId, 'approved');
      setProcessingId(null);
      setApproveModalData(null);
      if (res.success) {
        showNotification(`✓ Deposit for ${approveModalData.userName} approved successfully! Account activated and stake credited.`, 'success');
        loadData(true);
      }
    } catch (err) {
      setProcessingId(null);
      showNotification(`Approve failed: ${err.message}`, 'error');
    }
  };

  const handleConfirmDeclineDeposit = async (e) => {
    e.preventDefault();
    if (!declineModalData) return;
    setProcessingId(declineModalData.id);
    try {
      const res = await api.processDepositStatus(
        declineModalData.id,
        'declined',
        declineReason || 'Transaction reference could not be verified in bank statement.'
      );
      setProcessingId(null);
      setDeclineModalData(null);
      setDeclineReason('');
      if (res.success) {
        showNotification('Deposit verification request declined.', 'success');
        loadData(true);
      }
    } catch (err) {
      setProcessingId(null);
      showNotification(`Decline failed: ${err.message}`, 'error');
    }
  };

  // --- BANK ACCOUNT CRUD HANDLERS ---
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountFormData.bankName || !accountFormData.accountNumber) return;

    try {
      if (editingAccountId) {
        const res = await api.updatePaymentAccount(editingAccountId, accountFormData);
        if (res.success) {
          showNotification('Payment account updated successfully.', 'success');
        }
      } else {
        const res = await api.createPaymentAccount(accountFormData);
        if (res.success) {
          showNotification('New payment account added successfully.', 'success');
        }
      }

      setShowAccountForm(false);
      setEditingAccountId(null);
      setAccountFormData({
        bankName: 'Commercial Bank of Ethiopia (CBE)',
        accountName: 'Ethio-Lingo Platform',
        accountNumber: '',
        instructions: '',
        isActive: true,
      });
      loadData(true);
    } catch (err) {
      showNotification(`Save account error: ${err.message}`, 'error');
    }
  };

  const handleEditAccount = (acc) => {
    setEditingAccountId(acc.id);
    setAccountFormData({
      bankName: acc.bankName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      instructions: acc.instructions || '',
      isActive: acc.isActive,
    });
    setShowAccountForm(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deleteAccountModalData) return;
    const accId = deleteAccountModalData.id;
    try {
      const res = await api.deletePaymentAccount(accId);
      setDeleteAccountModalData(null);
      if (res.success) {
        showNotification('Payment account deleted.', 'success');
        loadData(true);
      }
    } catch (err) {
      showNotification(`Delete error: ${err.message}`, 'error');
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    if (depositFilter === 'all') return true;
    return d.status === depositFilter;
  });

  return (
    <div className="space-y-6 transition-colors duration-250">
      {/* Sub-Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <span className="px-2.5 py-0.5 bg-surface-dark text-warning-amber border border-stone-800 font-mono text-[10px] font-bold rounded uppercase">
            ADMIN FINANCE CENTER
          </span>
          <h2 className="font-serif font-bold text-2xl text-on-surface mt-1">
            Payment Approvals & Bank Accounts Catalog
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Data Button */}
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-4 py-2 bg-surface-lowest border border-hairline hover:border-primary-coral text-on-surface font-semibold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary-coral' : 'text-primary-coral'} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Deposit Requests'}</span>
          </button>
        </div>
      </div>

      {/* Styled Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 animate-fade-in shadow-xs ${
            feedbackMsg.type === 'error'
              ? 'bg-red-500/15 border-red-500/30 text-destructive-red'
              : 'bg-green-500/15 border-green-500/30 text-success-green'
          }`}
        >
          {feedbackMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'deposits'}
          onClick={() => setActiveTab('deposits')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            activeTab === 'deposits'
              ? 'border-primary-coral text-primary-coral'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <CreditCard size={16} />
          <span>Deposit Verifications Queue ({deposits.filter((d) => d.status === 'pending').length} Pending)</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'accounts'}
          onClick={() => setActiveTab('accounts')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            activeTab === 'accounts'
              ? 'border-primary-coral text-primary-coral'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Building2 size={16} />
          <span>Manage Bank & Wallet Accounts ({paymentAccounts.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: DEPOSIT VERIFICATION QUEUE */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas border border-hairline rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-on-surface-variant font-bold">Filter Status:</span>
              {['pending', 'approved', 'declined', 'all'].map((st) => (
                <button
                  key={st}
                  onClick={() => setDepositFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize transition-all focus-ring ${
                    depositFilter === st
                      ? 'bg-surface-dark text-white'
                      : 'bg-surface-lowest text-on-surface border border-hairline hover:border-primary-coral'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadData(false)}
              disabled={isRefreshing}
              className="text-xs font-mono text-primary-coral hover:underline flex items-center gap-1 font-bold focus-ring rounded p-1"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Reload Queue</span>
            </button>
          </div>

          {/* Deposit Requests Table */}
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3.5 px-4">Learner Name & Email</th>
                  <th className="py-3.5 px-4">Payment Channel</th>
                  <th className="py-3.5 px-4">Transaction Ref (TxRef)</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Receipt Screenshot</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs font-mono">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted font-sans">
                      No deposit verification requests found for filter "{depositFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-surface-soft transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-on-surface">{dep.userName}</div>
                        <div className="text-[11px] text-text-muted font-mono">{dep.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-medium text-on-surface">
                        {dep.paymentChannel}
                      </td>
                      <td className="py-3.5 px-4 text-primary-coral font-bold font-mono">
                        {dep.transactionRef}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        {formatETB(dep.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {dep.receiptUrl ? (
                          <button
                            onClick={() => setSelectedReceiptUrl(dep.receiptUrl)}
                            className="px-2.5 py-1 bg-surface-soft border border-primary-coral/30 hover:border-primary-coral text-primary-coral text-[11px] font-bold rounded-lg flex items-center gap-1 focus-ring"
                          >
                            <Eye size={14} />
                            <span>View Screenshot</span>
                          </button>
                        ) : (
                          <span className="text-text-muted text-[10px]">No Image Attached</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${
                            dep.status === 'pending'
                              ? 'bg-amber-500/20 text-warning-amber border border-amber-500/30'
                              : dep.status === 'approved'
                              ? 'bg-green-500/20 text-success-green border border-green-500/30'
                              : 'bg-red-500/20 text-destructive-red border border-red-500/30'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {dep.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              onClick={() => setApproveModalData(dep)}
                              disabled={processingId === dep.id}
                              className="px-3 py-1.5 bg-success-green hover:bg-green-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs focus-ring btn-interactive cursor-pointer"
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setDeclineModalData(dep)}
                              disabled={processingId === dep.id}
                              className="px-3 py-1.5 bg-destructive-red hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs focus-ring btn-interactive cursor-pointer"
                            >
                              <X size={14} />
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-muted text-[10px] font-mono">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PAYMENT ACCOUNTS MANAGEMENT (BANK CRUD) */}
      {activeTab === 'accounts' && (
        <div className="bg-canvas border border-hairline rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
            <div>
              <span className="text-xs font-mono text-primary-coral font-bold uppercase">
                PAYMENT ACCOUNTS CONFIGURATION
              </span>
              <h3 className="font-serif font-bold text-xl text-on-surface mt-0.5">
                Bank & Digital Wallet Accounts Catalog
              </h3>
              <p className="text-xs text-on-surface-variant">
                Learners see these bank details & wallet account numbers in their deposit modal.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingAccountId(null);
                setAccountFormData({
                  bankName: 'Commercial Bank of Ethiopia (CBE)',
                  accountName: 'Ethio-Lingo Platform',
                  accountNumber: '',
                  instructions: '',
                  isActive: true,
                });
                setShowAccountForm(!showAccountForm);
              }}
              className="px-4 py-2 bg-primary-coral text-white font-semibold text-xs rounded-xl hover:bg-primary-hover flex items-center gap-1.5 shadow-xs focus-ring btn-interactive cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Bank / Wallet Account</span>
            </button>
          </div>

          {/* Account Form (Add/Edit) */}
          {showAccountForm && (
            <form onSubmit={handleSaveAccount} className="p-5 bg-surface-lowest border-2 border-primary-coral rounded-2xl space-y-4 animate-fade-in shadow-md">
              <h4 className="font-serif font-bold text-base text-on-surface">
                {editingAccountId ? 'Edit Payment Account' : 'Add New Payment Account'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Bank / Wallet Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Commercial Bank of Ethiopia (CBE) / Telebirr"
                    value={accountFormData.bankName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bankName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ethio-Lingo Learning Press"
                    value={accountFormData.accountName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Account Number / Phone Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456789 or 0911223344"
                    value={accountFormData.accountNumber}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">Transfer Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Use CBE Mobile App or *889# to transfer."
                    value={accountFormData.instructions}
                    onChange={(e) => setAccountFormData({ ...accountFormData, instructions: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={accountFormData.isActive}
                  onChange={(e) => setAccountFormData({ ...accountFormData, isActive: e.target.checked })}
                  className="rounded text-primary-coral focus-ring"
                />
                <label htmlFor="isActive" className="text-xs font-mono text-on-surface font-bold">
                  Active (Visible to learners in deposit modal)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowAccountForm(false)}
                  className="px-4 py-2 border border-hairline text-xs font-semibold rounded-xl text-on-surface-variant focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-coral text-white text-xs font-semibold rounded-xl hover:bg-primary-hover focus-ring btn-interactive"
                >
                  Save Payment Account
                </button>
              </div>
            </form>
          )}

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentAccounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 bg-surface-lowest border border-hairline rounded-2xl space-y-3 shadow-xs relative"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-surface-card text-primary-coral rounded uppercase">
                      {acc.bankName}
                    </span>
                    <h4 className="font-serif font-bold text-base text-on-surface">{acc.accountName}</h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                      acc.isActive ? 'bg-green-500/20 text-success-green' : 'bg-surface-card text-text-muted'
                    }`}
                  >
                    {acc.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="p-3 bg-canvas border border-hairline rounded-xl font-mono text-sm font-bold text-on-surface">
                  {acc.accountNumber}
                </div>

                {acc.instructions && (
                  <p className="text-xs text-on-surface-variant italic">{acc.instructions}</p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                  <button
                    onClick={() => handleEditAccount(acc)}
                    className="p-1.5 text-on-surface-variant hover:text-primary-coral hover:bg-surface-card rounded-lg transition-colors focus-ring"
                    title="Edit Account"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteAccountModalData(acc)}
                    className="p-1.5 text-destructive-red hover:bg-red-500/10 rounded-lg transition-colors focus-ring"
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PROPER BRANDED MODAL COMPONENTS --- */}

      {/* 1. Approve Deposit Confirmation Modal */}
      {approveModalData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-deposit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-canvas border border-hairline rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative overflow-hidden transition-colors duration-250">
            <div className="w-12 h-12 bg-green-500/20 text-success-green rounded-full flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>

            <div>
              <h3 id="approve-deposit-title" className="font-serif font-bold text-lg text-on-surface">Confirm Deposit Approval</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Are you sure you want to approve this deposit? The user account will be activated and their escrow vault stake will be credited immediately.
              </p>
            </div>

            <div className="p-3 bg-surface-soft border border-hairline rounded-xl font-mono text-xs space-y-1 text-on-surface">
              <div>Learner: <strong>{approveModalData.userName}</strong> ({approveModalData.userEmail})</div>
              <div>TxRef ID: <strong className="text-primary-coral">{approveModalData.transactionRef}</strong></div>
              <div>Channel: <strong>{approveModalData.paymentChannel}</strong></div>
              <div>Total Deposited: <strong>{formatETB(approveModalData.amount)}</strong></div>
              <div>Net Escrow Credit (0% fee): <strong className="text-success-green">{formatETB(approveModalData.amount)}</strong></div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
              <button
                onClick={() => setApproveModalData(null)}
                disabled={processingId === approveModalData.id}
                className="px-4 py-2 border border-hairline text-xs font-semibold rounded-xl text-on-surface-variant hover:bg-surface-card focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproveDeposit}
                disabled={processingId === approveModalData.id}
                className="px-5 py-2 bg-success-green hover:bg-green-600 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 focus-ring btn-interactive cursor-pointer"
              >
                {processingId === approveModalData.id ? 'Processing...' : 'Confirm & Approve Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Decline Deposit Modal */}
      {declineModalData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-deposit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-canvas border border-hairline rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl transition-colors duration-250">
            <div className="w-12 h-12 bg-red-500/20 text-destructive-red rounded-full flex items-center justify-center">
              <XCircle size={24} />
            </div>

            <div>
              <h3 id="decline-deposit-title" className="font-serif font-bold text-lg text-on-surface">Decline Deposit Request</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Learner: <strong>{declineModalData.userName}</strong> ({declineModalData.userEmail})<br />
                TxRef: <strong className="font-mono text-primary-coral">{declineModalData.transactionRef}</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmDeclineDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-on-surface-variant mb-1">
                  Reason for Declining
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Transaction reference ID not found in bank statement or amount mismatch."
                  className="w-full p-3 bg-surface-lowest border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setDeclineModalData(null)}
                  className="px-4 py-2 border border-hairline text-xs font-semibold rounded-xl text-on-surface-variant hover:bg-surface-card focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === declineModalData.id}
                  className="px-5 py-2 bg-destructive-red hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs focus-ring btn-interactive cursor-pointer"
                >
                  {processingId === declineModalData.id ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Bank Account Confirmation Modal */}
      {deleteAccountModalData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-canvas border border-hairline rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl transition-colors duration-250">
            <div className="w-12 h-12 bg-red-500/20 text-destructive-red rounded-full flex items-center justify-center">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 id="delete-account-title" className="font-serif font-bold text-lg text-on-surface">Delete Payment Account</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Are you sure you want to delete <strong>{deleteAccountModalData.bankName}</strong> ({deleteAccountModalData.accountNumber})? Learners will no longer see this bank account.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
              <button
                onClick={() => setDeleteAccountModalData(null)}
                className="px-4 py-2 border border-hairline text-xs font-semibold rounded-xl text-on-surface-variant hover:bg-surface-card focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                className="px-5 py-2 bg-destructive-red hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs focus-ring btn-interactive cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Screenshot Lightbox Modal */}
      {selectedReceiptUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-surface-dark border border-stone-700 rounded-2xl max-w-2xl w-full p-4 relative space-y-3">
            <div className="flex items-center justify-between text-white border-b border-stone-800 pb-2">
              <span id="receipt-lightbox-title" className="font-mono text-xs font-bold">Uploaded Payment Receipt Screenshot</span>
              <button onClick={() => setSelectedReceiptUrl(null)} aria-label="Close image" className="p-1 hover:text-red-400 focus-ring rounded">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-black p-2 rounded-xl">
              <img src={selectedReceiptUrl} alt="Receipt Screenshot" className="max-w-full max-h-[65vh] object-contain" />
            </div>
            <div className="flex justify-end">
              <a
                href={selectedReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary-coral hover:bg-primary-hover text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 focus-ring btn-interactive"
              >
                <ExternalLink size={14} />
                <span>Open Original Image</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentManagement;
