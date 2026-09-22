import React, { useState, useEffect } from 'react';
import { Search, Filter, Send, RefreshCw, UserCheck, UserX, ShieldAlert, SlidersHorizontal, Settings2 } from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { api } from '../../services/api';
import StudentDetailsDrawer from './components/StudentDetailsDrawer';

const AdminLearnersPage = () => {
  const { withdrawalRequests } = useStaking();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'withdrawals'
  const [learnersList, setLearnersList] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [withdrawalActionModal, setWithdrawalActionModal] = useState(null); // { id, status, request }
  const [selectedStudentId, setSelectedStudentId] = useState(null); // student ID for drawer

  // Fetch directory & withdrawal requests from backend API
  const loadData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [learnersRes, withdrawalsRes] = await Promise.all([
        api.getLearnerDirectory().catch(() => null),
        api.getAllWithdrawalRequests().catch(() => null),
      ]);

      if (learnersRes && learnersRes.success && Array.isArray(learnersRes.data)) {
        setLearnersList(learnersRes.data);
      }
      if (withdrawalsRes && withdrawalsRes.success && Array.isArray(withdrawalsRes.data)) {
        setAllWithdrawals(withdrawalsRes.data);
      } else {
        setAllWithdrawals(withdrawalRequests);
      }
    } catch {
      setAllWithdrawals(withdrawalRequests);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [withdrawalRequests]);

  const handleConfirmUpdateWithdrawalStatus = async () => {
    if (!withdrawalActionModal) return;
    const { id, status } = withdrawalActionModal;
    try {
      const res = await api.processWithdrawalStatus(id, status);
      setWithdrawalActionModal(null);
      if (res.success) {
        setAllWithdrawals((prev) =>
          prev.map((w) => (w.id === id ? { ...w, status } : w))
        );
      }
    } catch {
      setWithdrawalActionModal(null);
      setAllWithdrawals((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status } : w))
      );
    }
  };

  const filteredLearners = learnersList.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevelFilter === 'ALL' || l.level === selectedLevelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 transition-colors duration-250">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <span className="text-xs font-mono text-primary-coral uppercase tracking-wider font-semibold">
            Admin Management Portal
          </span>
          <h1 className="font-serif font-bold text-3xl text-on-surface mt-1">
            Student Management & Directory
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Inspect individual student profiles, edit levels and days, manage account suspensions, adjust audited balances, and process escrow payout requests.
          </p>
        </div>

        <button
          onClick={() => loadData(false)}
          disabled={isRefreshing}
          className="px-4 py-2.5 bg-surface-lowest border border-hairline hover:border-primary-coral text-on-surface font-semibold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary-coral' : 'text-primary-coral'} />
          <span>{isRefreshing ? 'Refreshing Data...' : 'Refresh Directory & Withdrawals'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'directory'}
          onClick={() => setActiveTab('directory')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            activeTab === 'directory'
              ? 'border-primary-coral text-primary-coral'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Learner Directory ({filteredLearners.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'withdrawals'}
          onClick={() => setActiveTab('withdrawals')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring ${
            activeTab === 'withdrawals'
              ? 'border-primary-coral text-primary-coral'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Withdrawal Payouts ({allWithdrawals.filter((w) => w.status === 'pending').length} Pending)</span>
        </button>
      </div>

      {/* TAB 1: Learner Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-surface-lowest border border-hairline rounded-xl flex-1 max-w-md focus-within:border-primary-coral transition-colors">
              <Search size={16} className="text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search by name, email, or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search learners by name or email address"
                className="w-full bg-transparent text-sm text-on-surface focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-on-surface-variant" />
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                aria-label="Filter learners by curriculum level"
                className="px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-semibold text-on-surface focus-ring"
              >
                <option value="ALL">All Curriculum Levels</option>
                <option value="Free Trial">Free Trial</option>
                {CURRICULUM_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3.5 px-4">Learner Name & ID</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Track & Day</th>
                  <th className="py-3.5 px-4">Staked Vault</th>
                  <th className="py-3.5 px-4">Streak</th>
                  <th className="py-3.5 px-4">Access Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs font-mono">
                {filteredLearners.length > 0 ? (
                  filteredLearners.map((l) => {
                    const status = l.status || (l.isActive ? 'ACTIVE' : 'SUSPENDED');
                    return (
                      <tr key={l.id} className="hover:bg-surface-soft transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-sans font-bold text-on-surface block">{l.name}</span>
                          <span className="text-text-muted font-mono text-[10px] truncate max-w-[140px] block">{l.id}</span>
                        </td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-sans">{l.email}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 bg-surface-card text-primary-coral font-bold rounded-lg text-[10px]">
                              {l.level || 'Beginner I'}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted font-bold">
                              D{l.currentDay || 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-on-surface">
                          <div>{formatETB(l.stakedAmount ?? 0)}</div>
                          {l.isFreeTrial && (
                            <span className="text-[9px] text-warning-amber font-mono block">Free Trial</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-streak-orange font-bold">
                          {l.streakCount || 0} Days 🔥
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              status === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : status === 'SUSPENDED'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                : 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border border-stone-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status === 'ACTIVE' ? 'bg-emerald-500' : status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-stone-400'
                              }`}
                            />
                            <span>{status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedStudentId(l.id)}
                            className="px-3.5 py-1.5 bg-primary-coral hover:bg-primary-hover text-white font-sans font-semibold rounded-xl text-[11px] transition-colors focus-ring shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Settings2 size={13} />
                            <span>Manage Student</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-on-surface-variant font-sans">
                      <p className="font-semibold text-xs">No learners found matching the search or filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Withdrawal Requests Management */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-soft border border-hairline rounded-xl text-xs text-on-surface-variant space-y-1">
            <span className="font-bold text-primary-coral block">Manual Bank & Telebirr Payout Protocol:</span>
            <p>
              Ethio-Lingo platform currently processes withdrawals manually. Admins must inspect the bank details provided below, execute the money transfer via bank app / Telebirr, and update the status to <strong>Approved</strong>, <strong>Declined</strong>, or <strong>Refunded</strong>.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request ID & Learner</th>
                  <th className="py-3.5 px-4">Level Completed</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Banking Information</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Payout Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs font-mono">
                {allWithdrawals.map((req) => (
                  <tr key={req.id} className="hover:bg-surface-soft transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="text-primary-coral font-bold block text-[10px]">{req.id}</span>
                      <span className="font-sans font-bold text-on-surface">{req.userName}</span>
                      <span className="text-text-muted font-mono block text-[10px]">{req.userEmail}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 bg-surface-card text-on-surface rounded-lg text-[10px] font-semibold">
                        {req.levelCompleted}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-on-surface">{formatETB(req.amount)}</td>
                    <td className="py-3.5 px-4 font-sans text-on-surface-variant">
                      <div><strong>Bank:</strong> {req.bankName}</div>
                      <div><strong>Acc:</strong> {req.accountNumber}</div>
                      <div><strong>Telebirr:</strong> {req.telebirrNumber || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          req.status === 'approved'
                            ? 'bg-green-500/20 text-success-green'
                            : req.status === 'declined'
                              ? 'bg-red-500/20 text-destructive-red'
                              : req.status === 'refunded'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-amber-500/20 text-warning-amber'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => setWithdrawalActionModal({ id: req.id, status: 'approved', request: req })}
                              className="px-3 py-1.5 bg-success-green hover:bg-green-600 text-white font-semibold rounded-xl text-[10px] focus-ring btn-interactive cursor-pointer"
                            >
                              Approve Payout
                            </button>
                            <button
                              onClick={() => setWithdrawalActionModal({ id: req.id, status: 'declined', request: req })}
                              className="px-3 py-1.5 bg-destructive-red hover:bg-red-700 text-white font-semibold rounded-xl text-[10px] focus-ring btn-interactive cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setWithdrawalActionModal({ id: req.id, status: 'refunded', request: req })}
                              className="px-3 py-1.5 bg-surface-card hover:bg-surface-high text-on-surface font-semibold rounded-xl text-[10px] focus-ring cursor-pointer"
                            >
                              Mark Refunded
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branded Withdrawal Confirmation Modal */}
      {withdrawalActionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-withdrawal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-canvas border border-hairline rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl transition-colors duration-250">
            <div className="flex items-center gap-3 border-b border-hairline pb-3">
              <div className="w-10 h-10 bg-primary-coral text-white rounded-xl flex items-center justify-center font-bold">
                W
              </div>
              <div>
                <h3 id="confirm-withdrawal-title" className="font-serif font-bold text-base text-on-surface capitalize">
                  Confirm Withdrawal Action: {withdrawalActionModal.status}
                </h3>
                <p className="text-xs text-text-muted">Escrow Payout Control</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant">
              Are you sure you want to mark withdrawal request <strong className="font-mono text-primary-coral">{withdrawalActionModal.request.id}</strong> for <strong>{withdrawalActionModal.request.userName}</strong> as <strong className="uppercase font-mono">{withdrawalActionModal.status}</strong>?
            </p>

            <div className="p-3 bg-surface-soft border border-hairline rounded-xl font-mono text-xs space-y-1 text-on-surface">
              <div>Payout Amount: <strong>{formatETB(withdrawalActionModal.request.amount)}</strong></div>
              <div>Bank: <strong>{withdrawalActionModal.request.bankName}</strong></div>
              <div>Account Number: <strong>{withdrawalActionModal.request.accountNumber}</strong></div>
              {withdrawalActionModal.request.telebirrNumber && (
                <div>Telebirr: <strong>{withdrawalActionModal.request.telebirrNumber}</strong></div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
              <button
                onClick={() => setWithdrawalActionModal(null)}
                className="px-4 py-2 border border-hairline text-xs font-semibold rounded-xl text-on-surface-variant hover:bg-surface-card focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdateWithdrawalStatus}
                className="px-5 py-2 bg-primary-coral hover:bg-primary-hover text-white text-xs font-semibold rounded-xl shadow-xs focus-ring btn-interactive cursor-pointer"
              >
                Confirm {withdrawalActionModal.status}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Student Details & Action Management Drawer */}
      {selectedStudentId && (
        <StudentDetailsDrawer
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onStudentUpdated={() => loadData(true)}
        />
      )}
    </div>
  );
};

export default AdminLearnersPage;
