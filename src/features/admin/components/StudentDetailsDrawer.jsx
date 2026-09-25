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
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-3xl bg-surface-lowest text-on-surface shadow-2xl h-full flex flex-col border-l border-hairline/60 transition-all duration-300 transform animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-hairline bg-surface-container/60 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-cormorant shrink-0">
              {studentData?.name ? studentData.name.charAt(0).toUpperCase() : <User size={24} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-cormorant text-2xl font-normal text-on-surface">
                  {studentData?.name || 'Loading Learner...'}
                </h2>
                <span
                  className={`font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    formData.status === 'ACTIVE'
                      ? 'bg-success-green/10 text-success-green'
                      : formData.status === 'SUSPENDED'
                      ? 'bg-destructive-red/10 text-destructive-red'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {formData.status}
                </span>
                {studentData?.wallet?.isFreeTrial && (
                  <span className="px-2 py-0.5 bg-warning-amber/10 text-warning-amber border border-warning-amber/30 text-[10px] font-mono font-semibold rounded uppercase tracking-wider">
                    FREE TRIAL ({studentData?.wallet?.freeTrialDaysLeft}d left)
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-text-muted mt-1">
                {studentData?.email} • ID: <span className="text-primary font-bold">{studentId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadPdf}
              disabled={!studentData || isGeneratingPdf}
              title="Download Student Report (PDF)"
              className="rounded-full bg-primary hover:bg-primary-container text-on-primary text-[10px] tracking-wider uppercase font-semibold px-4 py-2 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-ring cursor-pointer"
            >
              {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              <span className="hidden sm:inline">{isGeneratingPdf ? 'Generating…' : 'Download Report'}</span>
            </button>
            <button
              onClick={() => loadStudentDetails(false)}
              disabled={isLoading}
              title="Refresh Data"
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-soft rounded-full transition-colors focus-ring cursor-pointer"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-primary' : ''} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="p-2 text-on-surface-variant hover:text-destructive-red hover:bg-surface-soft rounded-full transition-colors focus-ring cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        {studentData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-surface-low border-b border-hairline/50 shrink-0 text-xs font-mono">
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline/60 space-y-0.5">
              <span className="mono-micro-label text-text-muted block">Level & Day</span>
              <div className="font-cormorant text-lg font-normal text-on-surface">
                {studentData.level || 'Beginner I'} <span className="text-primary">D{studentData.currentDay || 1}</span>
              </div>
            </div>
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline/60 space-y-0.5">
              <span className="mono-micro-label text-text-muted block">Staked Escrow</span>
              <div className="font-cormorant text-lg font-normal text-on-surface tabular-nums">
                {formatETB(studentData.wallet?.stakedAmount || 0)}
              </div>
            </div>
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline/60 space-y-0.5">
              <span className="mono-micro-label text-text-muted block">Available Balance</span>
              <div className="font-cormorant text-lg font-normal text-success-green tabular-nums">
                {formatETB(studentData.wallet?.availableBalance || 0)}
              </div>
            </div>
            <div className="p-3 bg-surface-lowest rounded-xl border border-hairline/60 space-y-0.5">
              <span className="mono-micro-label text-text-muted block">Streak Record</span>
              <div className="font-cormorant text-lg font-normal text-streak-orange flex items-center gap-1.5">
                <Flame size={14} />
                <span className="tabular-nums">{studentData.wallet?.streakCount || 0} Days</span>
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 border-b border-hairline bg-surface-lowest shrink-0 overflow-x-auto" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
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
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer whitespace-nowrap ${
              activeTab === 'progress'
                ? 'border-primary text-primary'
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
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'border-primary text-primary'
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
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 focus-ring cursor-pointer whitespace-nowrap ${
              activeTab === 'exams'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Exam Results ({studentData?.examAttempts?.length || 0})</span>
          </button>
        </div>

        {/* DRAWER BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant font-mono text-xs">
              <Loader2 size={30} className="animate-spin text-primary" />
              <span>Loading complete student record...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive-red/10 border border-destructive-red/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {pdfNotice && (
                <div className="p-3 bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                  <FileDown size={16} className="shrink-0" />
                  <span>{pdfNotice}</span>
                </div>
              )}
              {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {saveSuccessMsg && (
                    <div className="p-3 bg-success-green/10 border border-success-green/30 text-success-green text-xs font-mono font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                      <CheckCircle size={16} />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* Profile & Academic Track Form */}
                  <form onSubmit={handleSaveProfile} className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between gap-3 border-b border-hairline/50 pb-4">
                      <div>
                        <span className="mono-micro-label text-primary flex items-center gap-1.5">
                          <Shield size={13} /> Account
                        </span>
                        <h3 className="font-cormorant text-xl font-normal text-on-surface mt-1">
                          Academic Track & Account Permissions
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        Created: {formatDate(studentData?.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs text-on-surface outline-none focus:border-primary"
                          required
                        />
                      </div>

                      {/* Account Status / Lockout */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Account Access Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="ACTIVE">ACTIVE (Full Platform Access)</option>
                          <option value="SUSPENDED">SUSPENDED (Lockout Screen Enforced)</option>
                          <option value="INACTIVE">INACTIVE (Disabled)</option>
                        </select>
                      </div>

                      {/* Curriculum Level */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Curriculum Level Track
                        </label>
                        <select
                          value={formData.level}
                          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
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
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Current Module Day (1 to {formData.level === 'Free Trial' ? '7' : '30'})
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={formData.level === 'Free Trial' ? 7 : 30}
                            value={formData.currentDay}
                            onChange={(e) => setFormData({ ...formData, currentDay: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-mono text-on-surface outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Streak Days */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Streak Days Counter 🔥
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.streakCount}
                          onChange={(e) => setFormData({ ...formData, streakCount: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-mono text-on-surface outline-none focus:border-primary"
                        />
                      </div>

                      {/* Free Trial Toggle & Days Left */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Free Trial Status
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={formData.isFreeTrial ? 'true' : 'false'}
                            onChange={(e) => setFormData({ ...formData, isFreeTrial: e.target.value === 'true' })}
                            className="w-1/2 px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
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
                            className="w-1/2 px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-mono text-on-surface outline-none focus:border-primary disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-hairline/50">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="rounded-full bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-semibold text-xs tracking-wider uppercase px-5 py-2.5 flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer"
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
                  <form onSubmit={handleAdjustBalance} className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="border-b border-hairline/50 pb-4">
                      <div>
                        <span className="mono-micro-label text-primary flex items-center gap-1.5">
                          <DollarSign size={13} /> Escrow
                        </span>
                        <h3 className="font-cormorant text-xl font-normal text-on-surface mt-1">
                          Audited Balance & Stake Adjustment
                        </h3>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          Directly credit or deduct ETB. An immutable <code className="font-mono text-primary">ADMIN_ADJUSTMENT</code> transaction will be automatically written to the ledger.
                        </p>
                      </div>
                    </div>

                    {adjustSuccessMsg && (
                      <div className="p-3 bg-success-green/10 border border-success-green/30 text-success-green text-xs font-mono font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
                        <CheckCircle size={16} />
                        <span>{adjustSuccessMsg}</span>
                      </div>
                    )}

                    {adjustErrorMsg && (
                      <div className="p-3 bg-destructive-red/10 border border-destructive-red/30 text-destructive-red text-xs rounded-xl flex items-center gap-2 font-mono animate-fade-in">
                        <AlertCircle size={16} />
                        <span>{adjustErrorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Balance Type */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Account Balance Target
                        </label>
                        <select
                          value={adjustForm.balanceType}
                          onChange={(e) => setAdjustForm({ ...adjustForm, balanceType: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="stakedAmount">Staked Escrow Vault</option>
                          <option value="availableBalance">Available Balance</option>
                        </select>
                      </div>

                      {/* Action Type */}
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Action
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustForm({ ...adjustForm, actionType: 'add' })}
                            className={`py-2 px-2 rounded-full text-xs font-bold font-mono flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              adjustForm.actionType === 'add'
                                ? 'bg-success-green/15 text-success-green border-success-green'
                                : 'bg-surface-lowest text-on-surface-variant border-hairline'
                            }`}
                          >
                            <PlusCircle size={13} />
                            <span>Add (+)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustForm({ ...adjustForm, actionType: 'deduct' })}
                            className={`py-2 px-2 rounded-full text-xs font-bold font-mono flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                              adjustForm.actionType === 'deduct'
                                ? 'bg-destructive-red/15 text-destructive-red border-destructive-red'
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
                        <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                          Adjustment Amount (ETB)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          placeholder="e.g. 500"
                          value={adjustForm.amount}
                          onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                          className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs font-mono font-semibold text-on-surface outline-none focus:border-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Reason / Admin Audit Note */}
                    <div>
                      <label className="mono-micro-label text-on-surface-variant block mb-1.5">
                        Reason & Audit Memo <span className="text-text-muted font-normal">(Logged into student transaction ledger)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Manual bank deposit verification ref #12345 / Technical streak reimbursement"
                        value={adjustForm.reason}
                        onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                        className="w-full px-3 py-2 bg-surface-low border border-hairline rounded-xl text-xs text-on-surface outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline/50">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono text-text-muted">Presets:</span>
                        {['100', '250', '500', '1000'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAdjustForm({ ...adjustForm, amount: preset })}
                            className="px-2.5 py-0.5 bg-surface-container border border-hairline hover:border-primary text-on-surface font-mono text-[10px] rounded-full transition-colors cursor-pointer"
                          >
                            {preset} ETB
                          </button>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={isAdjustingBalance || !adjustForm.amount}
                        className={`rounded-full text-white font-semibold text-[10px] tracking-wider uppercase px-5 py-2.5 flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer disabled:opacity-50 transition-colors ${
                          adjustForm.actionType === 'add'
                            ? 'bg-success-green hover:bg-success-green/90'
                            : 'bg-destructive-red hover:bg-destructive-red/90'
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
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="mono-micro-label text-primary">Daily Records</span>
                      <h3 className="font-cormorant text-xl font-normal text-on-surface mt-1">Daily Task & Exam Records</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Chronological record of completed daily lessons, listening, and exam evaluations.
                      </p>
                    </div>
                  </div>

                  {studentData?.dailyProgress && studentData.dailyProgress.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                            <th className="py-3 px-4 font-normal">Day & Date</th>
                            <th className="py-3 px-3 font-normal">Level Track</th>
                            <th className="py-3 px-3 font-normal">Task 1 (Lesson)</th>
                            <th className="py-3 px-3 font-normal">Task 2 (Listening)</th>
                            <th className="py-3 px-4 text-right font-normal">Daily Exam</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-mono">
                          {studentData.dailyProgress.map((dp) => (
                            <tr key={dp.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-semibold text-on-surface">Day {dp.dayNumber}</span>
                                <span className="text-[10px] text-text-muted block">{dp.progressDate}</span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-on-surface">{dp.level}</td>
                              <td className="py-3 px-3">
                                {dp.task1LessonCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-success-green font-semibold text-[11px]">
                                    <Check size={13} /> Completed
                                  </span>
                                ) : (
                                  <span className="text-text-muted text-[11px]">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {dp.task2ListeningCompleted ? (
                                  <span className="inline-flex items-center gap-1 text-success-green font-semibold text-[11px]">
                                    <Check size={13} /> Completed
                                  </span>
                                ) : (
                                  <span className="text-text-muted text-[11px]">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {dp.examCompleted ? (
                                  <span
                                    className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                                      dp.examPassed
                                        ? 'bg-success-green/10 text-success-green'
                                        : 'bg-destructive-red/10 text-destructive-red'
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
                    <div className="py-12 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm flex flex-col items-center justify-center gap-2 text-on-surface-variant font-sans">
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="mono-micro-label text-primary">Ledger</span>
                        <h3 className="font-cormorant text-xl font-normal text-on-surface mt-1">Financial Ledger Audit Trail</h3>
                      </div>
                      <span className="text-xs font-mono text-text-muted shrink-0">
                        Total Transactions: {studentData?.ledgerTransactions?.length || 0}
                      </span>
                    </div>

                    {studentData?.ledgerTransactions && studentData.ledgerTransactions.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                              <th className="py-3 px-4 font-normal">Transaction Type</th>
                              <th className="py-3 px-3 font-normal">Amount</th>
                              <th className="py-3 px-3 font-normal">Status</th>
                              <th className="py-3 px-4 font-normal">Description / Audit Memo</th>
                              <th className="py-3 px-4 text-right font-normal">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs font-mono">
                            {studentData.ledgerTransactions.map((tx) => (
                              <tr key={tx.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-on-surface block text-[11px]">{tx.type}</span>
                                  <span className="text-[9px] text-text-muted">{tx.id}</span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-on-surface tabular-nums">
                                  {formatETB(tx.amount || 0)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                                      tx.status === 'SUCCESS' || tx.status === 'COMPLETED'
                                        ? 'bg-success-green/10 text-success-green'
                                        : tx.status === 'PENALTY'
                                        ? 'bg-destructive-red/10 text-destructive-red'
                                        : 'bg-warning-amber/10 text-warning-amber'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-on-surface-variant font-sans text-xs max-w-xs break-words">
                                  {tx.description || 'N/A'}
                                  {tx.chapaTxRef && (
                                    <span className="block text-[10px] font-mono text-primary mt-0.5">
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
                      <div className="py-10 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm flex flex-col items-center justify-center gap-2 text-on-surface-variant font-sans">
                        <FileText size={24} className="text-text-muted opacity-40" />
                        <p className="font-semibold text-xs">No ledger transactions on record</p>
                      </div>
                    )}
                  </div>

                  {/* Withdrawal Requests Sub-Section */}
                  {studentData?.withdrawals && studentData.withdrawals.length > 0 && (
                    <div className="space-y-3 pt-5 border-t border-hairline/50">
                      <div>
                        <span className="mono-micro-label text-primary">Payouts</span>
                        <h3 className="font-cormorant text-xl font-normal text-on-surface mt-1">Withdrawal Payout Requests</h3>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                              <th className="py-3 px-4 font-normal">Amount</th>
                              <th className="py-3 px-3 font-normal">Bank & Account</th>
                              <th className="py-3 px-3 font-normal">Status</th>
                              <th className="py-3 px-4 text-right font-normal">Requested Date</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs font-mono">
                            {studentData.withdrawals.map((w) => (
                              <tr key={w.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                                <td className="py-3 px-4 font-semibold text-on-surface tabular-nums">{formatETB(w.amount)}</td>
                                <td className="py-3 px-3 font-sans text-xs">
                                  <div>{w.bankName}</div>
                                  <span className="font-mono text-text-muted text-[10px]">{w.accountNumber}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                                      w.status === 'approved' || w.status === 'completed'
                                        ? 'bg-success-green/10 text-success-green'
                                        : w.status === 'declined'
                                        ? 'bg-destructive-red/10 text-destructive-red'
                                        : 'bg-warning-amber/10 text-warning-amber'
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
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="mono-micro-label text-primary">Exams</span>
                      <h3 className="font-cormorant text-xl font-normal text-on-surface mt-1">Complete Exam History</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Every exam this student has taken — expand any attempt to review each question, the student's answer,
                        and the correct answer.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-text-muted shrink-0">
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
                            className="rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm overflow-hidden"
                          >
                            {/* Attempt Header */}
                            <button
                              type="button"
                              onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                              className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 hover:bg-surface-soft transition-colors cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-on-surface text-xs">
                                  Day {attempt.dayNumber}
                                </span>
                                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider bg-surface-container text-on-surface-variant border border-hairline">
                                  {attempt.level}
                                </span>
                              </div>
                              <span
                                className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                                  attempt.passed
                                    ? 'bg-success-green/10 text-success-green'
                                    : 'bg-destructive-red/10 text-destructive-red'
                                }`}
                              >
                                {attempt.passed ? 'PASSED' : 'FAILED'}
                              </span>
                              <span className="text-xs font-mono text-on-surface font-semibold tabular-nums">
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
                              <div className="border-t border-hairline/50 divide-y divide-hairline/50">
                                {review.length === 0 ? (
                                  <div className="px-5 py-6 text-xs text-text-muted font-mono">
                                    No per-question detail recorded for this attempt.
                                  </div>
                                ) : (
                                  review.map((q, idx) => (
                                    <div key={q.questionId || idx} className="px-5 py-4 space-y-2.5">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs font-semibold text-on-surface font-sans leading-relaxed">
                                          <span className="font-mono text-primary mr-1.5">Q{idx + 1}.</span>
                                          {q.question}
                                        </p>
                                        <span
                                          className={`shrink-0 px-2 py-0.5 rounded uppercase tracking-wider font-mono text-[9px] ${
                                            q.isCorrect
                                              ? 'bg-success-green/10 text-success-green'
                                              : 'bg-destructive-red/10 text-destructive-red'
                                          }`}
                                        >
                                          {q.isCorrect ? 'Matched' : 'Incorrect'}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                                        <div className="px-3 py-2 rounded-xl border border-hairline bg-surface-low">
                                          <span className="mono-micro-label text-text-muted block mb-1">Student's Answer</span>
                                          <span className={q.isCorrect ? 'text-success-green' : 'text-destructive-red'}>
                                            {q.yourAnswer || '(Not answered)'}
                                          </span>
                                        </div>
                                        <div className="px-3 py-2 rounded-xl border border-hairline bg-surface-low">
                                          <span className="mono-micro-label text-text-muted block mb-1">Correct Answer</span>
                                          <span className="text-success-green">{q.correctAnswer || 'N/A'}</span>
                                        </div>
                                      </div>
                                      {q.explanation && (
                                        <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed bg-surface-low border border-hairline rounded-xl px-3 py-2">
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
                    <div className="py-12 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm flex flex-col items-center justify-center gap-2 text-on-surface-variant font-sans">
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