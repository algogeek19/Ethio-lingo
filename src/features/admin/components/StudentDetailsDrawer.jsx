import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  BookOpen,
  Flame,
  Award,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  TrendingUp,
  Save,
  Loader2,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Lock,
  Unlock,
  Check,
  AlertCircle,
  ChevronDown,
  FileDown,
} from 'lucide-react';
import { formatETB, formatDate } from '../../../utils/formatters';
import { downloadStudentReportPdf } from '../../../utils/studentReportPdf';
import { CURRICULUM_LEVELS } from '../../../context/StakingContext';
import { api } from '../../../services/api';

const ALL_LEVELS = ['Free Trial', ...CURRICULUM_LEVELS];

export const StudentDetailsDrawer = ({ studentId, onClose, onStudentUpdated }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'progress' | 'ledger' | 'exams'
  const [studentData, setStudentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [expandedAttemptId, setExpandedAttemptId] = useState(null);

  // Editable Form State
  const [formData, setFormData] = useState({
    name: '',
    level: 'Beginner I',
    currentDay: 1,
    status: 'ACTIVE',
    isActive: true,
    streakCount: 0,
    isFreeTrial: false,
    freeTrialDaysLeft: 7,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Balance Adjustment Form State
  const [adjustForm, setAdjustForm] = useState({
    balanceType: 'stakedAmount', // 'stakedAmount' | 'availableBalance'
    actionType: 'add', // 'add' | 'deduct'
    amount: '',
    reason: '',
  });
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');
  const [adjustErrorMsg, setAdjustErrorMsg] = useState('');

  // PDF Report Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState('');

  const handleDownloadPdf = () => {
    if (!studentData || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfNotice('');
    // Let the button render its spinner before the (synchronous) PDF build starts.
    setTimeout(() => {
      try {
        downloadStudentReportPdf(studentData);
        setPdfNotice('Student report downloaded as PDF.');
      } catch (err) {
        setPdfNotice(`Failed to generate PDF: ${err?.message || 'unknown error'}`);
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 50);
  };

  const loadStudentDetails = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const res = await api.getLearnerDetails(studentId);
      if (res.success && res.data) {
        const u = res.data;
        setStudentData(u);
        setFormData({
          name: u.name || '',
          level: u.level || 'Beginner I',
          currentDay: u.currentDay || 1,
          status: u.status || (u.isActive ? 'ACTIVE' : 'SUSPENDED'),
          isActive: u.isActive !== undefined ? u.isActive : true,
          streakCount: u.wallet ? u.wallet.streakCount : 0,
          isFreeTrial: u.wallet ? Boolean(u.wallet.isFreeTrial) : false,
          freeTrialDaysLeft: u.wallet ? u.wallet.freeTrialDaysLeft : 7,
        });
      } else {
        setError(res.message || 'Failed to fetch student details.');
      }
    } catch (err) {
      setError(err.message || 'Error loading student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      loadStudentDetails();
    }
  }, [studentId]);

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveSuccessMsg('');
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        level: formData.level,
        currentDay: parseInt(formData.currentDay, 10),
        status: formData.status,
        isActive: formData.status === 'ACTIVE',
        streakCount: parseInt(formData.streakCount, 10),
        isFreeTrial: formData.isFreeTrial,
        freeTrialDaysLeft: parseInt(formData.freeTrialDaysLeft, 10),
      };

      const res = await api.updateLearner(studentId, payload);
      if (res.success && res.data) {
        setStudentData(res.data);
        setSaveSuccessMsg('Student profile updated successfully!');
        if (onStudentUpdated) onStudentUpdated(res.data);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save student profile updates.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Balance Adjustment
  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    const rawAmt = parseFloat(adjustForm.amount);
    if (isNaN(rawAmt) || rawAmt <= 0) {
      setAdjustErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    setIsAdjustingBalance(true);
    setAdjustErrorMsg('');
    setAdjustSuccessMsg('');

    const finalAmount = adjustForm.actionType === 'add' ? rawAmt : -rawAmt;

    try {
      const payload = {
        balanceType: adjustForm.balanceType,
        amount: finalAmount,
        reason: adjustForm.reason.trim() || `Admin manual ${adjustForm.actionType === 'add' ? 'addition' : 'deduction'} of ${rawAmt} ETB`,
      };

      const res = await api.adjustLearnerBalance(studentId, payload);
      if (res.success) {
        setAdjustSuccessMsg(
          `Successfully ${adjustForm.actionType === 'add' ? 'added' : 'deducted'} ${rawAmt} ETB on ${
            adjustForm.balanceType === 'availableBalance' ? 'Available Balance' : 'Staked Vault'
          } and recorded ledger transaction.`
        );
        setAdjustForm({ ...adjustForm, amount: '', reason: '' });
        // Refresh full data to update ledger and wallet balances
        await loadStudentDetails(true);
        if (onStudentUpdated) onStudentUpdated();
        setTimeout(() => setAdjustSuccessMsg(''), 5000);
      }
    } catch (err) {
      setAdjustErrorMsg(err.message || 'Failed to adjust balance.');
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-3xl bg-surface-lowest text-on-surface shadow-2xl h-full flex flex-col border-l border-hairline transition-all duration-300 transform animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-hairline bg-surface-card flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-dark text-white flex items-center justify-center font-bold text-lg font-serif shrink-0 border border-stone-800">
              {studentData?.name ? studentData.name.charAt(0).toUpperCase() : <User size={24} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif font-bold text-xl text-on-surface">
                  {studentData?.name || 'Loading Learner...'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    formData.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : formData.status === 'SUSPENDED'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border border-stone-500/30'
                  }`}
                >
                  {formData.status}
                </span>
                {studentData?.wallet?.isFreeTrial && (
                  <span className="px-2 py-0.5 bg-amber-500/15 text-warning-amber border border-amber-500/30 text-[10px] font-mono font-bold rounded">
                    FREE TRIAL ({studentData?.wallet?.freeTrialDaysLeft}d left)
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-text-muted mt-0.5">
                {studentData?.email} • ID: <span className="text-primary-coral font-bold">{studentId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={!studentData || isGeneratingPdf}
              title="Download Student Report (PDF)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-primary-coral text-white rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring cursor-pointer"
            >
              {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              <span className="hidden sm:inline">{isGeneratingPdf ? 'Generating…' : 'Download Report'}</span>
            </button>
            <button
              onClick={() => loadStudentDetails(false)}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-soft rounded-xl transition-colors focus-ring cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-primary-coral' : ''} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="p-2 text-on-surface-variant hover:text-destructive-red hover:bg-surface-soft rounded-xl transition-colors focus-ring cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        {studentData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-canvas border-b border-hairline shrink-0 text-xs font-mono">
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline space-y-0.5">
              <span className="text-[10px] text-text-muted uppercase">Level & Day</span>
              <div className="font-bold text-on-surface text-sm">
                {studentData.level || 'Beginner I'} <span className="text-primary-coral">D{studentData.currentDay || 1}</span>
              </div>
            </div>
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline space-y-0.5">
              <span className="text-[10px] text-text-muted uppercase">Staked Escrow</span>
              <div className="font-bold text-on-surface text-sm">
                {formatETB(studentData.wallet?.stakedAmount || 0)}
              </div>
            </div>
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline space-y-0.5">
              <span className="text-[10px] text-text-muted uppercase">Available Balance</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatETB(studentData.wallet?.availableBalance || 0)}
              </div>
            </div>
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline space-y-0.5">
              <span className="text-[10px] text-text-muted uppercase">Streak Record</span>
              <div className="font-bold text-streak-orange text-sm flex items-center gap-1">
                <Flame size={14} />
                <span>{studentData.wallet?.streakCount || 0} Days</span>
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 border-b border-hairline bg-surface-lowest shrink-0" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer ${
              activeTab === 'overview'
                ? 'border-primary-coral text-primary-coral'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <User size={14} />
            <span>Profile & Quick Actions</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'progress'}
            onClick={() => setActiveTab('progress')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer ${
              activeTab === 'progress'
                ? 'border-primary-coral text-primary-coral'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Award size={14} />
            <span>Daily Progress & Exams ({studentData?.dailyProgress?.length || 0})</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'ledger'}
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer ${
              activeTab === 'ledger'
                ? 'border-primary-coral text-primary-coral'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <FileText size={14} />
            <span>Financial Ledger ({studentData?.ledgerTransactions?.length || 0})</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'exams'}
            onClick={() => setActiveTab('exams')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer ${
              activeTab === 'exams'
                ? 'border-primary-coral text-primary-coral'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Exam Results ({studentData?.examAttempts?.length || 0})</span>
          </button>
        </div>

        {/* DRAWER BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant font-mono text-xs">
              <Loader2 size={30} className="animate-spin text-primary-coral" />
              <span>Loading complete student record...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/15 border border-red-500/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {pdfNotice && (
                <div className="p-3 bg-primary-coral/10 border border-primary-coral/30 text-primary-coral dark:text-primary-warm text-xs font-mono font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                  <FileDown size={16} className="shrink-0" />
                  <span>{pdfNotice}</span>
                </div>
              )}
              {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {saveSuccessMsg && (
                    <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                      <CheckCircle size={16} />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Profile & Academic Track Form */}
                  <form onSubmit={handleSaveProfile} className="bg-canvas border border-hairline rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-hairline pb-3">
                      <h3 className="font-serif font-bold text-base text-on-surface flex items-center gap-2">
                        <Shield size={16} className="text-primary-coral" />
                        <span>Academic Track & Account Permissions</span>
                      </h3>
                      <span className="text-[10px] font-mono text-text-muted">
                        Created: {formatDate(studentData?.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                          required
                        />
                      </div>

                      {/* Account Status / Lockout */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Account Access Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-semibold text-on-surface focus-ring cursor-pointer"
                        >
                          <option value="ACTIVE">ACTIVE (Full Platform Access)</option>
                          <option value="SUSPENDED">SUSPENDED (Lockout Screen Enforced)</option>
                          <option value="INACTIVE">INACTIVE (Disabled)</option>
                        </select>
                      </div>

                      {/* Curriculum Level */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Curriculum Level Track
                        </label>
                        <select
                          value={formData.level}
                          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-semibold text-on-surface focus-ring cursor-pointer"
                        >
                          {ALL_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Current Day (1 to 30) */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Current Module Day (1 to {formData.level === 'Free Trial' ? '7' : '30'})
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={formData.level === 'Free Trial' ? 7 : 30}
                            value={formData.currentDay}
                            onChange={(e) => setFormData({ ...formData, currentDay: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                          />
                        </div>
                      </div>

                      {/* Streak Days */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Streak Days Counter 🔥
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.streakCount}
                          onChange={(e) => setFormData({ ...formData, streakCount: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring"
                        />
                      </div>

                      {/* Free Trial Toggle & Days Left */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Free Trial Status
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={formData.isFreeTrial ? 'true' : 'false'}
                            onChange={(e) => setFormData({ ...formData, isFreeTrial: e.target.value === 'true' })}
                            className="w-1/2 px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-semibold text-on-surface focus-ring cursor-pointer"
                          >
                            <option value="true">Trial Active</option>
                            <option value="false">Staked Mode</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            max="7"
                            disabled={!formData.isFreeTrial}
                            title="Days left in free trial"
                            value={formData.freeTrialDaysLeft}
                            onChange={(e) => setFormData({ ...formData, freeTrialDaysLeft: e.target.value })}
                            placeholder="Days left"
                            className="w-1/2 px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-mono text-on-surface focus-ring disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-hairline">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="px-5 py-2.5 bg-primary-coral hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer"
                      >
                        {isSavingProfile ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save size={15} />
                            <span>Save Profile & Track</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Manual Stake & Financial Adjustment Panel */}
                  <form onSubmit={handleAdjustBalance} className="bg-canvas border border-hairline rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-hairline pb-3">
                      <div>
                        <h3 className="font-serif font-bold text-base text-on-surface flex items-center gap-2">
                          <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Audited Balance & Stake Adjustment</span>
                        </h3>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Directly credit or deduct ETB. An immutable <code className="font-mono text-primary-coral">ADMIN_ADJUSTMENT</code> transaction will be automatically written to the ledger.
                        </p>
                      </div>
                    </div>

                    {adjustSuccessMsg && (
                      <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                        <CheckCircle size={16} />
                        <span>{adjustSuccessMsg}</span>
                      </div>
                    )}

                    {adjustErrorMsg && (
                      <div className="p-3 bg-red-500/15 border border-red-500/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono animate-fade-in">
                        <AlertCircle size={16} />
                        <span>{adjustErrorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Balance Type */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Account Balance Target
                        </label>
                        <select
                          value={adjustForm.balanceType}
                          onChange={(e) => setAdjustForm({ ...adjustForm, balanceType: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-semibold text-on-surface focus-ring cursor-pointer"
                        >
                          <option value="stakedAmount">Staked Escrow Vault</option>
                          <option value="availableBalance">Available Balance</option>
                        </select>
                      </div>

                      {/* Action Type */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Action
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustForm({ ...adjustForm, actionType: 'add' })}
                            className={`py-2 px-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              adjustForm.actionType === 'add'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500'
                                : 'bg-surface-lowest text-on-surface-variant border-hairline'
                            }`}
                          >
                            <PlusCircle size={13} />
                            <span>Add (+)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustForm({ ...adjustForm, actionType: 'deduct' })}
                            className={`py-2 px-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              adjustForm.actionType === 'deduct'
                                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500'
                                : 'bg-surface-lowest text-on-surface-variant border-hairline'
                            }`}
                          >
                            <MinusCircle size={13} />
                            <span>Deduct (-)</span>
                          </button>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                          Adjustment Amount (ETB)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          placeholder="e.g. 500"
                          value={adjustForm.amount}
                          onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs font-mono font-bold text-on-surface focus-ring"
                          required
                        />
                      </div>
                    </div>

                    {/* Reason / Admin Audit Note */}
                    <div>
                      <label className="block text-[11px] font-mono font-bold text-on-surface-variant mb-1">
                        Reason & Audit Memo <span className="text-text-muted font-normal">(Logged into student transaction ledger)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Manual bank deposit verification ref #12345 / Technical streak reimbursement"
                        value={adjustForm.reason}
                        onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                        className="w-full px-3 py-2 bg-surface-lowest border border-hairline rounded-xl text-xs text-on-surface focus-ring"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-hairline">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-text-muted">Presets:</span>
                        {['100', '250', '500', '1000'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAdjustForm({ ...adjustForm, amount: preset })}
                            className="px-2 py-0.5 bg-surface-card border border-hairline hover:border-primary-coral text-on-surface font-mono text-[10px] rounded-lg transition-colors cursor-pointer"
                          >
                            {preset} ETB
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={isAdjustingBalance || !adjustForm.amount}
                        className={`px-5 py-2.5 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer disabled:opacity-50 ${
                          adjustForm.actionType === 'add'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {isAdjustingBalance ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            {adjustForm.actionType === 'add' ? <PlusCircle size={15} /> : <MinusCircle size={15} />}
                            <span>Apply Balance {adjustForm.actionType === 'add' ? 'Credit' : 'Deduction'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: DAILY PROGRESS & EXAMS */}
              {activeTab === 'progress' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-base text-on-surface">Daily Task & Exam Records</h3>
                      <p className="text-xs text-on-surface-variant">
                        Chronological record of completed daily lessons, listening, and exam evaluations.
                      </p>
                    </div>
                  </div>

                  {studentData?.dailyProgress && studentData.dailyProgress.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-card border-b border-hairline text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider font-mono">
                            <th className="py-3 px-4">Day & Date</th>
                            <th className="py-3 px-3">Level Track</th>
                            <th className="py-3 px-3">Task 1 (Lesson)</th>
                            <th className="py-3 px-3">Task 2 (Listening)</th>
                            <th className="py-3 px-4 text-right">Daily Exam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline text-xs font-mono">
                          {studentData.dailyProgress.map((dp) => (
                            <tr key={dp.id} className="hover:bg-surface-soft transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-bold text-on-surface">Day {dp.dayNumber}</span>
                                <span className="text-[10px] text-text-muted block">{dp.progressDate}</span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-on-surface">{dp.level}</td>
                              <td className="py-3 px-3">
                                {dp.task1LessonCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                    <Check size={13} /> Completed
                                  </span>
                                ) : (
                                  <span className="text-text-muted text-[11px]">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {dp.task2ListeningCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                    <Check size={13} /> Completed
                                  </span>
                                ) : (
                                  <span className="text-text-muted text-[11px]">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {dp.examCompleted ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      dp.examPassed
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                    }`}
                                  >
                                    {dp.examScore}/20 ({dp.examPassed ? 'PASSED' : 'FAILED'})
                                  </span>
                                ) : (
                                  <span className="text-text-muted text-[10px]">Not Attempted</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 bg-canvas rounded-2xl border border-hairline flex flex-col items-center justify-center gap-2 text-on-surface-variant font-sans">
                      <Calendar size={28} className="text-text-muted opacity-40" />
                      <p className="font-semibold text-xs">No daily progress recorded yet</p>
                      <p className="text-[11px] text-text-muted">Progress entries will automatically populate as this student studies.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FINANCIAL LEDGER & WITHDRAWALS */}
              {activeTab === 'ledger' && (
                <div className="space-y-6">
                  {/* Ledger Transactions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-base text-on-surface">Financial Ledger Audit Trail</h3>
                      <span className="text-xs font-mono text-text-muted">
                        Total Transactions: {studentData?.ledgerTransactions?.length || 0}
                      </span>
                    </div>

                    {studentData?.ledgerTransactions && studentData.ledgerTransactions.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-card border-b border-hairline text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Transaction Type</th>
                              <th className="py-3 px-3">Amount</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-4">Description / Audit Memo</th>
                              <th className="py-3 px-4 text-right">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline text-xs font-mono">
                            {studentData.ledgerTransactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-surface-soft transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-bold text-on-surface block text-[11px]">{tx.type}</span>
                                  <span className="text-[9px] text-text-muted">{tx.id}</span>
                                </td>
                                <td className="py-3 px-3 font-bold text-on-surface">
                                  {formatETB(tx.amount || 0)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      tx.status === 'SUCCESS' || tx.status === 'COMPLETED'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : tx.status === 'PENALTY'
                                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                        : 'bg-amber-500/15 text-warning-amber'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-on-surface-variant font-sans text-xs max-w-xs break-words">
                                  {tx.description || 'N/A'}
                                  {tx.chapaTxRef && (
                                    <span className="block text-[10px] font-mono text-primary-coral mt-0.5">
                                      Ref: {tx.chapaTxRef}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right text-[10px] text-text-muted">
                                  {formatDate(tx.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-10 bg-canvas rounded-2xl border border-hairline flex flex-col items-center justify-center gap-2 text-on-surface-variant font-sans">
                        <FileText size={24} className="text-text-muted opacity-40" />
                        <p className="font-semibold text-xs">No ledger transactions on record</p>
                      </div>
                    )}
                  </div>

                  {/* Withdrawal Requests Sub-Section */}
                  {studentData?.withdrawals && studentData.withdrawals.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-hairline">
                      <h3 className="font-serif font-bold text-base text-on-surface">Withdrawal Payout Requests</h3>
                      <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-card border-b border-hairline text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Amount</th>
                              <th className="py-3 px-3">Bank & Account</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-4 text-right">Requested Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-hairline text-xs font-mono">
                            {studentData.withdrawals.map((w) => (
                              <tr key={w.id} className="hover:bg-surface-soft transition-colors">
                                <td className="py-3 px-4 font-bold text-on-surface">{formatETB(w.amount)}</td>
                                <td className="py-3 px-3 font-sans text-xs">
                                  <div>{w.bankName}</div>
                                  <span className="font-mono text-text-muted text-[10px]">{w.accountNumber}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      w.status === 'approved' || w.status === 'completed'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                        : w.status === 'declined'
                                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                        : 'bg-amber-500/15 text-warning-amber'
                                    }`}
                                  >
                                    {w.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right text-[10px] text-text-muted">
                                  {formatDate(w.requestedAt || w.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: COMPLETE EXAM RESULTS */}
              {activeTab === 'exams' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-base text-on-surface">Complete Exam History</h3>
                      <p className="text-xs text-on-surface-variant">
                        Every exam this student has taken — expand any attempt to review each question, the student's answer,
                        and the correct answer.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-text-muted">
                      {studentData?.examAttempts?.length || 0} exam(s) recorded
                    </span>
                  </div>

                  {studentData?.examAttempts && studentData.examAttempts.length > 0 ? (
                    <div className="space-y-3">
                      {studentData.examAttempts.map((attempt) => {
                        let review = [];
                        try {
                          review = typeof attempt.answersJson === 'string' ? JSON.parse(attempt.answersJson || '[]') : attempt.answersJson || [];
                        } catch (e) {
                          review = [];
                        }
                        const isExpanded = expandedAttemptId === attempt.id;
                        return (
                          <div
                            key={attempt.id}
                            className="rounded-2xl border border-hairline bg-canvas overflow-hidden"
                          >
                            {/* Attempt Header */}
                            <button
                              type="button"
                              onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                              className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 hover:bg-surface-soft transition-colors cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-on-surface text-xs">
                                  Day {attempt.dayNumber}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-surface-card border border-hairline text-[10px] font-mono text-on-surface-variant">
                                  {attempt.level}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  attempt.passed
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {attempt.passed ? 'PASSED' : 'FAILED'}
                              </span>
                              <span className="text-xs font-mono text-on-surface font-bold">
                                {attempt.score}/{attempt.totalQuestions}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted">
                                Pass mark: {attempt.passThreshold}
                              </span>
                              <span className="ml-auto flex items-center gap-2 text-[10px] font-mono text-text-muted">
                                {formatDate(attempt.createdAt)}
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </span>
                            </button>

                            {/* Per-Question Review */}
                            {isExpanded && (
                              <div className="border-t border-hairline divide-y divide-hairline">
                                {review.length === 0 ? (
                                  <div className="px-5 py-6 text-xs text-text-muted font-mono">
                                    No per-question detail recorded for this attempt.
                                  </div>
                                ) : (
                                  review.map((q, idx) => (
                                    <div key={q.questionId || idx} className="px-5 py-4 space-y-2.5">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs font-semibold text-on-surface font-sans leading-relaxed">
                                          <span className="font-mono text-primary-coral mr-1.5">Q{idx + 1}.</span>
                                          {q.question}
                                        </p>
                                        <span
                                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            q.isCorrect
                                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                          }`}
                                        >
                                          {q.isCorrect ? 'Matched' : 'Incorrect'}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                                        <div className="px-3 py-2 rounded-xl border border-hairline bg-surface-lowest">
                                          <span className="text-[9px] uppercase text-text-muted block mb-0.5">Student's Answer</span>
                                          <span className={q.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                            {q.yourAnswer || '(Not answered)'}
                                          </span>
                                        </div>
                                        <div className="px-3 py-2 rounded-xl border border-hairline bg-surface-lowest">
                                          <span className="text-[9px] uppercase text-text-muted block mb-0.5">Correct Answer</span>
                                          <span className="text-emerald-600 dark:text-emerald-400">{q.correctAnswer || 'N/A'}</span>
                                        </div>
                                      </div>
                                      {q.explanation && (
                                        <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed bg-surface-lowest border border-hairline rounded-xl px-3 py-2">
                                          <span className="font-mono text-[9px] uppercase text-text-muted">Why: </span>
                                          {q.explanation}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 bg-canvas rounded-2xl border border-hairline flex flex-col items-center justify-center gap-2 text-on-surface-variant font-sans">
                      <AlertTriangle size={28} className="text-text-muted opacity-40" />
                      <p className="font-semibold text-xs">No exam results recorded</p>
                      <p className="text-[11px] text-text-muted">Exam attempts will appear here once this student takes their daily exam.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsDrawer;
