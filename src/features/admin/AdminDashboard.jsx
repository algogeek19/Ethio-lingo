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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors duration-250"
    >
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-surface-dark text-warning-amber border border-stone-800 font-mono text-[10px] font-bold rounded-full uppercase">
              ADMIN CONTROL PANEL
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-2 tracking-tight">
            Ethio-Lingo Platform Escrow & Payment Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveSection(activeSection === 'payments' ? 'analytics' : 'payments')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs focus-ring btn-interactive cursor-pointer ${
              activeSection === 'payments'
                ? 'bg-primary-coral text-white'
                : 'bg-surface-lowest text-on-surface border border-hairline hover:border-primary-coral'
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
            className="px-4 py-2.5 bg-surface-dark hover:bg-stone-800 text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive"
          >
            <Users size={15} />
            <span>Learners Directory ({pendingWithdrawalsCount} Payouts)</span>
          </Link>

          <Link
            to="/admin/curriculum"
            className="px-4 py-2.5 bg-surface-lowest border border-hairline hover:border-primary-coral text-on-surface font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs focus-ring btn-interactive"
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
          className="bg-surface-dark text-white rounded-2xl p-6 shadow-xl border border-stone-800 space-y-2"
        >
          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider font-bold">
            Total Vault Pool Escrow
          </span>
          <div className="font-mono text-3xl font-bold text-white tracking-tight">
            {formatETB(analytics.totalStakedVaultETB)}
          </div>
          <div className="text-xs text-success-green flex items-center gap-1 font-mono">
            <TrendingUp size={14} /> Active Escrow Vault
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-2 shadow-xs"
        >
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold">
            Active Enrolled Learners
          </span>
          <div className="font-mono text-3xl font-bold text-on-surface tracking-tight">
            {analytics.totalLearners}
          </div>
          <div className="text-xs text-on-surface-variant">
            Avg Streak: {analytics.avgStreakCount} Days 🔥
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-2 shadow-xs"
        >
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold">
            Average Exam Pass Rate
          </span>
          <div className="font-mono text-3xl font-bold text-success-green tracking-tight">
            {analytics.passRatePercent}%
          </div>
          <div className="text-xs text-on-surface-variant">Verified 20-question daily diagnostics</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-2 shadow-xs"
        >
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold">
            Total Platform Revenue
          </span>
          <div className="font-mono text-3xl font-bold text-primary-coral tracking-tight">
            {formatETB(analytics.totalPlatformFeesETB)}
          </div>
          <div className="text-xs text-on-surface-variant">0% deposit fees • slashed penalties</div>
        </motion.div>
      </div>

      {/* Landing Page Explainer Video Control Box */}
      <div className="bg-surface-lowest border border-hairline rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-coral/10 text-primary-coral flex items-center justify-center font-bold">
              <Video size={18} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-on-surface">
                Landing Page Explainer Video Manager
              </h3>
              <p className="text-xs text-on-surface-variant">
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
              className="w-full px-4 py-2.5 bg-surface-soft border border-hairline rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary-coral font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingVideo}
            className="px-5 py-2.5 bg-primary-coral hover:bg-primary-hover active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-success-green font-mono flex items-center gap-2">
            <CheckCircle size={16} />
            <span>Landing page video URL updated successfully! Live immediately for all visitors.</span>
          </div>
        )}

        {videoSaveError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 font-mono">
            {videoSaveError}
          </div>
        )}
      </div>

      {activeSection === 'payments' ? (
        <AdminPaymentManagement />
      ) : (
        <div className="space-y-8">
          {/* Exam & Financial Analytics (featured) */}
          <div className="space-y-4">
            <h2 className="font-serif font-bold text-2xl text-on-surface flex items-center gap-2">
              <Activity size={18} className="text-primary-coral" /> Exam System & Financial Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Target size={13} /> Exams Taken
                </span>
                <div className="font-mono text-2xl font-bold text-on-surface">{examStats?.overall?.totalAttempts ?? 0}</div>
              </div>
              <div className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Target size={13} /> Passing Attempts
                </span>
                <div className="font-mono text-2xl font-bold text-success-green">{examStats?.overall?.totalPassed ?? 0}</div>
              </div>
              <div className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Target size={13} /> Failed Attempts
                </span>
                <div className="font-mono text-2xl font-bold text-warning-amber">{examStats?.overall?.totalFailed ?? 0}</div>
              </div>
              <div className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Target size={13} /> Exam Pass Rate
                </span>
                <div className="font-mono text-2xl font-bold text-primary-coral">
                  {examStats?.overall?.passRatePercent ?? 0}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-3">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Activity size={13} /> Exam Results by Level
                </span>
                {!examStats?.byLevel || examStats.byLevel.length === 0 ? (
                  <p className="text-xs font-mono text-on-surface-variant">No exam attempts recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {examStats.byLevel.map((row) => {
                      const pct = row.attempts ? Math.round((row.passed / row.attempts) * 100) : 0;
                      return (
                        <div key={row.level} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-on-surface font-bold">{row.level}</span>
                            <span className="text-on-surface-variant">
                              {row.passed}/{row.attempts} passed ({row.passRatePercent}%)
                            </span>
                          </div>
                          <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] font-mono text-on-surface-variant pt-1 border-t border-hairline">
                  Adaptive threshold: passing bar drops to 10/20 after 3 failed attempts.
                </p>
              </div>

              <div className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-3">
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Wallet size={13} /> Stake & Penalty Overview
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-card/60 rounded-xl">
                    <span className="block text-[10px] font-mono uppercase text-on-surface-variant font-bold">Total Staked</span>
                    <span className="font-mono text-xl font-bold text-on-surface">{formatETB(financeOverview?.vault?.totalStakedETB ?? 0)}</span>
                  </div>
                  <div className="p-3 bg-surface-card/60 rounded-xl">
                    <span className="block text-[10px] font-mono uppercase text-on-surface-variant font-bold">Penalties Collected</span>
                    <span className="font-mono text-xl font-bold text-destructive-red">{formatETB(financeOverview?.vault?.totalPenaltiesCollectedETB ?? 0)}</span>
                  </div>
                  <div className="p-3 bg-surface-card/60 rounded-xl">
                    <span className="block text-[10px] font-mono uppercase text-on-surface-variant font-bold">Platform Fees</span>
                    <span className="font-mono text-xl font-bold text-on-surface">{formatETB(financeOverview?.vault?.totalPlatformFeesETB ?? 0)}</span>
                  </div>
                  <div className="p-3 bg-surface-card/60 rounded-xl">
                    <span className="block text-[10px] font-mono uppercase text-on-surface-variant font-bold">Avg Streak</span>
                    <span className="font-mono text-xl font-bold text-streak-orange">{financeOverview?.vault?.avgStreakCount ?? 0}d</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-surface-card/60 border border-hairline rounded-lg text-[10px] font-mono text-on-surface-variant">
                    {financeOverview?.users?.activeLearners ?? 0} Active Learners
                  </span>
                  <span className="px-2.5 py-1 bg-surface-card/60 border border-hairline rounded-lg text-[10px] font-mono text-on-surface-variant">
                    {financeOverview?.users?.stakedUsers ?? 0} Staked Users
                  </span>
                  <span className="px-2.5 py-1 bg-surface-card/60 border border-hairline rounded-lg text-[10px] font-mono text-on-surface-variant">
                    {financeOverview?.users?.freeTrialUsers ?? 0} Free Trial
                  </span>
                  <span className="px-2.5 py-1 bg-surface-card/60 border border-hairline rounded-lg text-[10px] font-mono text-on-surface-variant">
                    {financeOverview?.users?.bannedLearners ?? 0} Banned
                  </span>
                </div>
                <p className="text-[11px] font-mono text-on-surface-variant pt-1 border-t border-hairline">
                  0% platform deposit fee • 25 ETB exam-failure penalty • 80 ETB streak-break penalty.
                </p>
              </div>
            </div>
          </div>

          {/* Admin Risk & Compliance Monitoring Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-2xl text-on-surface">
              Learner Escrow Risk & Payout Queue
            </h2>
            <Link to="/admin/learners" className="text-xs font-semibold text-primary-coral hover:underline font-mono focus-ring rounded p-1">
              View All Learners →
            </Link>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface-lowest shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Locked Stake</th>
                  <th className="py-3 px-4">Streak</th>
                  <th className="py-3 px-4 text-center">Curriculum Track</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs font-mono">
                {learnersList.length > 0 ? (
                  learnersList.map((learner) => (
                    <tr key={learner.id} className="hover:bg-surface-soft">
                      <td className="py-3.5 px-4 font-sans font-bold text-on-surface">{learner.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 bg-surface-card text-primary-coral font-bold rounded-lg text-[10px]">
                          {learner.level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-on-surface">{formatETB(learner.stakedAmount ?? 0)}</td>
                      <td className="py-3.5 px-4 text-streak-orange">{learner.streakCount ?? 0} Days 🔥</td>
                      <td className="py-3.5 px-4 text-center font-bold">{learner.level}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link to="/admin/learners" className="px-3 py-1 bg-surface-dark text-white rounded-xl text-[11px] hover:bg-stone-800 focus-ring">
                          Inspect Payout
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted font-sans text-sm">
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
