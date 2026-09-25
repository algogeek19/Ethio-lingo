import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CreditCard, BookOpen, Video, CheckCircle, Save, Target, Activity, Wallet } from 'lucide-react';
import { formatETB } from '../../utils/formatters';
import { useStaking } from '../../context/StakingContext';
import { api } from '../../services/api';
import AdminPaymentManagement from './AdminPaymentManagement';

const AdminDashboard = () => {
  const { withdrawalRequests } = useStaking();
  const [activeSection, setActiveSection] = useState('payments'); // 'payments' | 'analytics'
  const [analytics, setAnalytics] = useState({
    totalLearners: 0,
    totalStakedVaultETB: 0,
    totalPenaltiesSlashedETB: 0,
    totalPlatformFeesETB: 0,
    avgStreakCount: 0,
    passRatePercent: 0,
  });
  const [learnersList, setLearnersList] = useState([]);
  const [examStats, setExamStats] = useState(null);
  const [financeOverview, setFinanceOverview] = useState(null);
  
  // Landing Page Video Setting state
  const [landingVideoUrl, setLandingVideoUrl] = useState('');
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [videoSaveSuccess, setVideoSaveSuccess] = useState(false);
  const [videoSaveError, setVideoSaveError] = useState('');

  const pendingWithdrawalsCount = withdrawalRequests.filter((r) => r.status === 'pending').length;

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const res = await api.getAdminAnalytics();
        if (res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (e) {}

      try {
        const learnersRes = await api.getLearnerDirectory();
        if (learnersRes.success && learnersRes.data) {
          setLearnersList(learnersRes.data);
        }
      } catch (e) {}

      try {
        const videoRes = await api.getLandingVideoSetting();
        if (videoRes.data && videoRes.data.videoUrl) {
          setLandingVideoUrl(videoRes.data.videoUrl);
        }
      } catch (e) {}

      try {
        const examRes = await api.getAdminExamAnalytics();
        if (examRes.success && examRes.data) {
          setExamStats(examRes.data);
        }
      } catch (e) {}

      try {
        const finRes = await api.getAdminFinancialOverview();
        if (finRes.success && finRes.data) {
          setFinanceOverview(finRes.data);
        }
      } catch (e) {}
    };

    fetchAnalyticsData();
  }, []);

  const handleSaveLandingVideo = async (e) => {
    e.preventDefault();
    if (!landingVideoUrl.trim()) return;
    setIsSavingVideo(true);
    setVideoSaveSuccess(false);
    setVideoSaveError('');

    try {
      const res = await api.updateLandingVideoSetting(landingVideoUrl.trim());
      if (res.success) {
        setVideoSaveSuccess(true);
        setTimeout(() => setVideoSaveSuccess(false), 4000);
      } else {
        setVideoSaveError(res.message || 'Failed to update video link.');
      }
    } catch (err) {
      setVideoSaveError(err.message || 'Failed to update video link.');
    } finally {
      setIsSavingVideo(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-10 transition-colors duration-250"
    >
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-hairline/50 pb-6">
        <div>
          <span className="mono-micro-label text-primary">GOVERNANCE</span>
          <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2">
            Escrow & Payment Operations
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Approve escrow payouts, verify deposits, manage the landing video, and monitor learner risk analytics across every level.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveSection(activeSection === 'payments' ? 'analytics' : 'payments')}
            className={`rounded-full text-xs tracking-wider uppercase font-semibold px-5 py-2.5 flex items-center gap-2 transition-all focus-ring btn-interactive cursor-pointer ${
              activeSection === 'payments'
                ? 'bg-primary text-on-primary hover:bg-primary-container'
                : 'bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high'
            }`}
          >
            <CreditCard size={15} />
            <span>
              {activeSection === 'payments'
                ? 'View Exam Analytics & Financial Overview →'
                : '← Back to Payment Approvals'}
            </span>
          </motion.button>

          <Link
            to="/admin/learners"
            className="rounded-full bg-primary text-on-primary hover:bg-primary-container text-xs tracking-wider uppercase font-semibold px-5 py-2.5 transition-all flex items-center gap-2 focus-ring btn-interactive"
          >
            <Users size={15} />
            <span>Learners Directory ({pendingWithdrawalsCount} Payouts)</span>
          </Link>

          <Link
            to="/admin/curriculum"
            className="rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high text-xs tracking-wider uppercase font-semibold px-5 py-2.5 transition-all flex items-center gap-2 focus-ring btn-interactive"
          >
            <BookOpen size={15} />
            <span>Curriculum CMS</span>
          </Link>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3"
        >
          <span className="mono-micro-label text-primary">Total Vault Pool Escrow</span>
          <div className="font-cormorant text-3xl md:text-4xl font-normal text-primary tabular-nums">
            {formatETB(analytics.totalStakedVaultETB)}
          </div>
          <div className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-success-green/10 text-success-green">
            <TrendingUp size={11} /> Active Escrow Vault
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3"
        >
          <span className="mono-micro-label text-primary">Active Enrolled Learners</span>
          <div className="font-cormorant text-3xl md:text-4xl font-normal text-on-surface tabular-nums">
            {analytics.totalLearners}
          </div>
          <div className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
            Avg Streak: {analytics.avgStreakCount} Days
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3"
        >
          <span className="mono-micro-label text-primary">Average Exam Pass Rate</span>
          <div className="font-cormorant text-3xl md:text-4xl font-normal text-success-green tabular-nums">
            {analytics.passRatePercent}%
          </div>
          <div className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
            Verified 20-Question Diagnostics
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-3"
        >
          <span className="mono-micro-label text-primary">Total Platform Revenue</span>
          <div className="font-cormorant text-3xl md:text-4xl font-normal text-on-surface tabular-nums">
            {formatETB(analytics.totalPlatformFeesETB)}
          </div>
          <div className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
            0% Deposit Fees • Slashed Penalties
          </div>
        </motion.div>
      </div>

      {/* Landing Page Explainer Video Control Box */}
      <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Video size={18} />
            </div>
            <div>
              <span className="mono-micro-label text-primary">Landing Page Media</span>
              <h3 className="font-cormorant text-2xl font-normal text-on-surface mt-1">
                Explainer Video Manager
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Change the YouTube video link shown on the public landing page instantly without rebuilding or redeploying code.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveLandingVideo} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={landingVideoUrl}
              onChange={(e) => setLandingVideoUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or YouTube Video ID"
              className="w-full px-4 py-2.5 bg-surface-low border border-hairline rounded-xl text-xs text-on-surface outline-none focus:border-primary font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingVideo}
            className="rounded-full bg-primary hover:bg-primary-container active:scale-95 text-on-primary font-semibold text-xs tracking-wider uppercase px-5 py-2.5 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingVideo ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save size={15} />
                <span>Save Landing Video</span>
              </>
            )}
          </button>
        </form>

        {videoSaveSuccess && (
          <div className="p-3.5 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green font-mono flex items-center gap-2">
            <CheckCircle size={16} />
            <span>Landing page video URL updated successfully! Live immediately for all visitors.</span>
          </div>
        )}

        {videoSaveError && (
          <div className="p-3.5 bg-destructive-red/10 border border-destructive-red/30 rounded-xl text-xs text-destructive-red font-mono">
            {videoSaveError}
          </div>
        )}
      </div>

      {activeSection === 'payments' ? (
        <AdminPaymentManagement />
      ) : (
        <div className="space-y-10">
          {/* Exam & Financial Analytics (featured) */}
          <div className="space-y-6">
            <h2 className="font-cormorant text-3xl font-normal text-on-surface flex items-center gap-2">
              <Activity size={20} className="text-primary" /> Exam System & Financial Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-2">
                <span className="mono-micro-label text-primary flex items-center gap-1.5">
                  <Target size={12} /> Exams Taken
                </span>
                <div className="font-cormorant text-3xl font-normal text-on-surface tabular-nums">{examStats?.overall?.totalAttempts ?? 0}</div>
              </div>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-2">
                <span className="mono-micro-label text-primary flex items-center gap-1.5">
                  <Target size={12} /> Passing Attempts
                </span>
                <div className="font-cormorant text-3xl font-normal text-success-green tabular-nums">{examStats?.overall?.totalPassed ?? 0}</div>
              </div>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-2">
                <span className="mono-micro-label text-primary flex items-center gap-1.5">
                  <Target size={12} /> Failed Attempts
                </span>
                <div className="font-cormorant text-3xl font-normal text-warning-amber tabular-nums">{examStats?.overall?.totalFailed ?? 0}</div>
              </div>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-2">
                <span className="mono-micro-label text-primary flex items-center gap-1.5">
                  <Target size={12} /> Exam Pass Rate
                </span>
                <div className="font-cormorant text-3xl font-normal text-primary tabular-nums">
                  {examStats?.overall?.passRatePercent ?? 0}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-4">
                <span className="mono-micro-label text-primary flex items-center gap-1.5">
                  <Activity size={12} /> Exam Results by Level
                </span>
                {!examStats?.byLevel || examStats.byLevel.length === 0 ? (
                  <p className="text-xs font-mono text-on-surface-variant">No exam attempts recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {examStats.byLevel.map((row) => {
                      const pct = row.attempts ? Math.round((row.passed / row.attempts) * 100) : 0;
                      return (
                        <div key={row.level} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-on-surface font-semibold">{row.level}</span>
                            <span className="text-on-surface-variant">
                              {row.passed}/{row.attempts} passed ({row.passRatePercent}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-success-green rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] font-mono text-on-surface-variant pt-3 border-t border-hairline/50">
                  Adaptive threshold: passing bar drops to 10/20 after 3 failed attempts.
                </p>
              </div>

              <div className="bg-surface-lowest p-6 rounded-2xl border border-hairline/60 shadow-sm space-y-4">
                <span className="mono-micro-label text-primary flex items-center gap-1.5">
                  <Wallet size={12} /> Stake & Penalty Overview
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-surface-container/60 rounded-xl">
                    <span className="mono-micro-label text-on-surface-variant block">Total Staked</span>
                    <span className="font-cormorant text-2xl font-normal text-on-surface tabular-nums">{formatETB(financeOverview?.vault?.totalStakedETB ?? 0)}</span>
                  </div>
                  <div className="p-3.5 bg-surface-container/60 rounded-xl">
                    <span className="mono-micro-label text-on-surface-variant block">Penalties Collected</span>
                    <span className="font-cormorant text-2xl font-normal text-destructive-red tabular-nums">{formatETB(financeOverview?.vault?.totalPenaltiesCollectedETB ?? 0)}</span>
                  </div>
                  <div className="p-3.5 bg-surface-container/60 rounded-xl">
                    <span className="mono-micro-label text-on-surface-variant block">Platform Fees</span>
                    <span className="font-cormorant text-2xl font-normal text-on-surface tabular-nums">{formatETB(financeOverview?.vault?.totalPlatformFeesETB ?? 0)}</span>
                  </div>
                  <div className="p-3.5 bg-surface-container/60 rounded-xl">
                    <span className="mono-micro-label text-on-surface-variant block">Avg Streak</span>
                    <span className="font-cormorant text-2xl font-normal text-streak-orange tabular-nums">{financeOverview?.vault?.avgStreakCount ?? 0}d</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
                    {financeOverview?.users?.activeLearners ?? 0} Active
                  </span>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
                    {financeOverview?.users?.stakedUsers ?? 0} Staked
                  </span>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-surface-container text-on-surface-variant">
                    {financeOverview?.users?.freeTrialUsers ?? 0} Free Trial
                  </span>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-destructive-red/10 text-destructive-red">
                    {financeOverview?.users?.bannedLearners ?? 0} Banned
                  </span>
                </div>
                <p className="text-[11px] font-mono text-on-surface-variant pt-3 border-t border-hairline/50">
                  0% platform deposit fee • 25 ETB exam-failure penalty • 80 ETB streak-break penalty.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Risk & Compliance Monitoring Table */}
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-cormorant text-3xl font-normal text-on-surface">
                Learner Escrow Risk & Payout Queue
              </h2>
              <Link to="/admin/learners" className="text-xs font-mono font-semibold text-primary hover:underline focus-ring rounded p-0.5 shrink-0">
                View All Learners →
              </Link>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                    <th className="py-3.5 px-4 font-normal">Learner Name</th>
                    <th className="py-3.5 px-4 font-normal">Level</th>
                    <th className="py-3.5 px-4 font-normal">Locked Stake</th>
                    <th className="py-3.5 px-4 font-normal">Streak</th>
                    <th className="py-3.5 px-4 text-center font-normal">Curriculum Track</th>
                    <th className="py-3.5 px-4 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  {learnersList.length > 0 ? (
                    learnersList.map((learner) => (
                      <tr key={learner.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                        <td className="py-3.5 px-4 font-sans font-semibold text-on-surface">{learner.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-primary/10 text-primary">
                            {learner.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-on-surface tabular-nums">{formatETB(learner.stakedAmount ?? 0)}</td>
                        <td className="py-3.5 px-4 text-streak-orange">{learner.streakCount ?? 0} Days 🔥</td>
                        <td className="py-3.5 px-4 text-center font-semibold">{learner.level}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Link to="/admin/learners" className="rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high px-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-all focus-ring inline-flex items-center">
                            Inspect Payout
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-muted font-sans text-sm border-t border-hairline/50">
                        No learners registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;