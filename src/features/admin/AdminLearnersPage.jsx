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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-8 transition-colors duration-250">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline/50 pb-6">
        <div>
          <span className="mono-micro-label text-primary">GOVERNANCE</span>
          <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2">
            Student Management & Directory
          </h1>
          <p className="text-xs text-on-surface-variant mt-2">
            Inspect individual student profiles, edit levels and days, manage account suspensions, adjust audited balances, and process escrow payout requests.
          </p>
        </div>

        <button
          onClick={() => loadData(false)}
          disabled={isRefreshing}
          className="rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high text-xs tracking-wider uppercase font-semibold px-5 py-2.5 transition-all flex items-center gap-2 focus-ring btn-interactive cursor-pointer"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary' : 'text-primary'} />
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
              ? 'border-primary text-primary'
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
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Withdrawal Payouts ({allWithdrawals.filter((w) => w.status === 'pending').length} Pending)</span>
        </button>
      </div>

      {/* TAB 1: Learner Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-lowest border border-hairline rounded-full flex-1 max-w-md focus-within:border-primary transition-colors">
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
                className="px-3.5 py-2 bg-surface-lowest border border-hairline rounded-full text-xs font-semibold text-on-surface focus-ring"
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
          <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  <th className="py-3.5 px-4 font-normal">Learner Name & ID</th>
                  <th className="py-3.5 px-4 font-normal">Email</th>
                  <th className="py-3.5 px-4 font-normal">Track & Day</th>
                  <th className="py-3.5 px-4 font-normal">Staked Vault</th>
                  <th className="py-3.5 px-4 font-normal">Streak</th>
                  <th className="py-3.5 px-4 font-normal">Access Status</th>
                  <th className="py-3.5 px-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {filteredLearners.length > 0 ? (
                  filteredLearners.map((l) => {
                    const status = l.status || (l.isActive ? 'ACTIVE' : 'SUSPENDED');
                    return (
                      <tr key={l.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-sans font-semibold text-on-surface block">{l.name}</span>
                          <span className="text-text-muted font-mono text-[10px] truncate max-w-[140px] block">{l.id}</span>
                        </td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-sans">{l.email}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-primary/10 text-primary">
                              {l.level || 'Beginner I'}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted font-semibold">
                              D{l.currentDay || 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-on-surface tabular-nums">
                          <div>{formatETB(l.stakedAmount ?? 0)}</div>
                          {l.isFreeTrial && (
                            <span className="text-[9px] text-warning-amber font-mono block">Free Trial</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-streak-orange font-semibold tabular-nums">
                          {l.streakCount || 0} Days 🔥
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider inline-flex items-center gap-1 ${
                              status === 'ACTIVE'
                                ? 'bg-success-green/10 text-success-green'
                                : status === 'SUSPENDED'
                                ? 'bg-destructive-red/10 text-destructive-red'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status === 'ACTIVE' ? 'bg-success-green' : status === 'SUSPENDED' ? 'bg-destructive-red' : 'bg-text-muted'
                              }`}
                            />
                            <span>{status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedStudentId(l.id)}
                            className="rounded-full bg-primary hover:bg-primary-container text-on-primary font-sans font-semibold text-[10px] uppercase tracking-wider px-4 py-1.5 transition-all focus-ring shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
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
                    <td colSpan={7} className="py-10 text-center text-on-surface-variant font-sans border-t border-hairline/50">
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
        <div className="space-y-5">
          <div className="p-5 bg-surface-soft border border-hairline rounded-2xl text-xs text-on-surface-variant space-y-1">
            <span className="font-bold text-primary font-mono uppercase tracking-wider block">Manual Bank & Telebirr Payout Protocol:</span>
            <p>
              Ethio-Lingo platform currently processes withdrawals manually. Admins must inspect the bank details provided below, execute the money transfer via bank app / Telebirr, and update the status to <strong>Approved</strong>, <strong>Declined</strong>, or <strong>Refunded</strong>.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  <th className="py-3.5 px-4 font-normal">Request ID & Learner</th>
                  <th className="py-3.5 px-4 font-normal">Level Completed</th>
                  <th className="py-3.5 px-4 font-normal">Amount</th>
                  <th className="py-3.5 px-4 font-normal">Banking Information</th>
                  <th className="py-3.5 px-4 font-normal">Status</th>
                  <th className="py-3.5 px-4 text-right font-normal">Admin Payout Action</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {allWithdrawals.map((req) => (
                  <tr key={req.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="text-primary font-bold block text-[10px]">{req.id}</span>
                      <span className="font-sans font-semibold text-on-surface">{req.userName}</span>
                      <span className="text-text-muted font-mono block text-[10px]">{req.userEmail}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
                        {req.levelCompleted}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-on-surface tabular-nums">{formatETB(req.amount)}</td>
                    <td className="py-3.5 px-4 font-sans text-on-surface-variant">
                      <div><strong>Bank:</strong> {req.bankName}</div>
                      <div><strong>Acc:</strong> {req.accountNumber}</div>
                      <div><strong>Telebirr:</strong> {req.telebirrNumber || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                          req.status === 'approved'
                            ? 'bg-success-green/10 text-success-green'
                            : req.status === 'declined'
                              ? 'bg-destructive-red/10 text-destructive-red'
                              : req.status === 'refunded'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-warning-amber/10 text-warning-amber'
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
                              className="rounded-full bg-success-green text-white font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 transition-all hover:opacity-90 focus-ring btn-interactive cursor-pointer"
                            >
                              Approve Payout
                            </button>
                            <button
                              onClick={() => setWithdrawalActionModal({ id: req.id, status: 'declined', request: req })}
                              className="rounded-full bg-destructive-red text-white font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 transition-all hover:opacity-90 focus-ring btn-interactive cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setWithdrawalActionModal({ id: req.id, status: 'refunded', request: req })}
                              className="rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 transition-all focus-ring cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-surface-lowest border border-hairline rounded-2xl max-w-md w-full p-8 space-y-4 shadow-2xl transition-colors duration-250">
            <div className="flex items-center gap-3 border-b border-hairline/50 pb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                W
              </div>
              <div>
                <h3 id="confirm-withdrawal-title" className="font-cormorant text-2xl font-normal text-on-surface capitalize">
                  Confirm Withdrawal Action: {withdrawalActionModal.status}
                </h3>
                <p className="text-xs text-text-muted font-mono">Escrow Payout Control</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant">
              Are you sure you want to mark withdrawal request <strong className="font-mono text-primary">{withdrawalActionModal.request.id}</strong> for <strong>{withdrawalActionModal.request.userName}</strong> as <strong className="uppercase font-mono">{withdrawalActionModal.status}</strong>?
            </p>

            <div className="p-3.5 bg-surface-low border border-hairline rounded-xl font-mono text-xs space-y-1 text-on-surface">
              <div>Payout Amount: <strong>{formatETB(withdrawalActionModal.request.amount)}</strong></div>
              <div>Bank: <strong>{withdrawalActionModal.request.bankName}</strong></div>
              <div>Account Number: <strong>{withdrawalActionModal.request.accountNumber}</strong></div>
              {withdrawalActionModal.request.telebirrNumber && (
                <div>Telebirr: <strong>{withdrawalActionModal.request.telebirrNumber}</strong></div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-hairline/50">
              <button
                onClick={() => setWithdrawalActionModal(null)}
                className="rounded-full bg-surface-container text-on-surface border border-hairline text-xs font-semibold px-5 py-2.5 hover:bg-surface-container-high focus-ring cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdateWithdrawalStatus}
                className="rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold px-5 py-2.5 shadow-sm focus-ring btn-interactive cursor-pointer"
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