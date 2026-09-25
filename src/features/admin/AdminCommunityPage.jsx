import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Flag, CheckCircle2, Ban, XCircle, Megaphone, RefreshCw, Send, Smartphone, Users } from 'lucide-react';
import { api } from '../../services/api';

const LEVELS = ['ALL', 'Free Trial', 'Beginner I', 'Beginner II', 'Intermediate I', 'Intermediate II', 'Advanced I', 'Advanced II'];

// GeezSMS accepts up to ~335 characters; the service trims to 330 including the title prefix.
const SMS_CHAR_LIMIT = 330;

const maskPhone = (phone) => String(phone || '').replace(/^(\d{3})\d{4}(\d{3})$/, '$1••••$2');

const AdminCommunityPage = () => {
  const [tab, setTab] = useState('reports'); // 'reports' | 'sms'
  const [reports, setReports] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyReportId, setBusyReportId] = useState(null);

  // SMS broadcast state
  const [smsForm, setSmsForm] = useState({ audienceLevel: 'ALL', message: '' });
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState(null);
  const [smsLogs, setSmsLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const loadReports = useCallback(async (status = null) => {
    setLoadingReports(true);
    setError('');
    try {
      const res = await api.getChatReports(status);
      if (res && res.success) setReports(res.data || []);
      else setError(res?.message || 'Failed to load reports.');
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadSmsLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await api.getSmsLogs({ limit: 100 });
      if (res && res.success) setSmsLogs(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load delivery history.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadSmsLogs();
  }, [loadReports, loadSmsLogs]);

  // Live recipient preview whenever the audience changes
  useEffect(() => {
    let mounted = true;
    setRecipientCount(null);
    api
      .getAnnouncementAudienceCount(smsForm.audienceLevel)
      .then((res) => {
        if (mounted && res && res.success) setRecipientCount(res.data?.recipientCount ?? null);
      })
      .catch(() => {
        if (mounted) setRecipientCount(null);
      });
    return () => {
      mounted = false;
    };
  }, [smsForm.audienceLevel]);

  const handleResolveReport = async (report, status, ban = false) => {
    setBusyReportId(report.id);
    setError('');
    setNotice('');
    try {
      const res = await api.resolveChatReport(report.id, status, ban);
      setNotice(res?.message || (ban ? 'Report resolved and user banned.' : 'Report resolved.'));
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status } : r)));
    } catch (err) {
      setError(err.message || 'Failed to update report.');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    const message = smsForm.message.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const res = await api.createAnnouncement({
        title: `Broadcast · ${new Date().toLocaleString()}`,
        content: message,
        audienceLevel: smsForm.audienceLevel,
      });
      setNotice(res?.data?.sms?.note || res?.message || 'SMS broadcast sent.');
      setSmsForm((prev) => ({ ...prev, message: '' }));
      loadSmsLogs();
    } catch (err) {
      setError(err.message || 'Failed to send SMS broadcast.');
    } finally {
      setSending(false);
    }
  };

  const sentCount = smsLogs.filter((l) => l.status === 'SENT').length;
  const failedCount = smsLogs.filter((l) => l.status === 'FAILED').length;

  const badge = (status) =>
    status === 'open'
      ? 'bg-destructive-red/10 text-destructive-red'
      : status === 'resolved'
        ? 'bg-success-green/10 text-success-green'
        : 'bg-surface-container text-on-surface-variant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline/50 pb-6">
        <div>
          <span className="mono-micro-label text-primary">MODERATION & COMMUNITY</span>
          <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2">
            Community Moderation Center
          </h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Review reported chat messages, manage user bans, and broadcast announcements by SMS.
          </p>
        </div>
        <button
          onClick={() => setTab(tab === 'reports' ? 'sms' : 'reports')}
          className="rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high text-xs tracking-wider uppercase font-semibold px-5 py-2.5 transition-all flex items-center gap-2 focus-ring btn-interactive cursor-pointer"
        >
          {tab === 'reports' ? <Megaphone size={15} /> : <ShieldAlert size={15} />}
          <span>{tab === 'reports' ? 'Switch to SMS Broadcast' : 'Switch to Chat Reports'}</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green font-mono flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss"><XCircle size={14} /></button>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-destructive-red/10 border border-destructive-red/30 rounded-xl text-xs text-destructive-red font-mono flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss"><XCircle size={14} /></button>
        </div>
      )}

      {tab === 'reports' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-cormorant text-3xl font-normal text-on-surface flex items-center gap-2">
              <Flag size={18} className="text-destructive-red" /> Reported Chat Messages
            </h2>
            <button onClick={() => loadReports()} className="p-2 text-on-surface-variant hover:text-primary rounded-lg cursor-pointer focus-ring" aria-label="Refresh reports">
              <RefreshCw size={15} className={loadingReports ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['open', 'resolved', 'dismissed'].map((s) => (
              <button
                key={s}
                onClick={() => { setActiveStatus(s); loadReports(s); }}
                className={`rounded-full px-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer focus-ring ${
                  activeStatus === s
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container text-on-surface-variant border-hairline hover:border-primary'
                }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => { setActiveStatus(null); loadReports(null); }}
              className={`rounded-full px-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer focus-ring ${
                activeStatus === null
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container text-on-surface-variant border-hairline hover:border-primary'
              }`}
            >
              ALL
            </button>
          </div>

          <div className="space-y-4">
            {loadingReports ? (
              <p className="p-6 text-center text-xs font-mono text-on-surface-variant animate-skeleton">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="p-10 text-center text-sm text-on-surface-variant font-mono">No reported messages match this filter. Stay vigilant! 🛡️</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider border ${badge(r.status)}`}>{r.status}</span>
                      <span className="text-[11px] font-mono text-on-surface-variant">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    {r.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(r, 'resolved')}
                          disabled={busyReportId === r.id}
                          className="rounded-full bg-success-green/10 hover:bg-success-green/20 text-success-green border border-success-green/30 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} /> Resolve
                        </button>
                        <button
                          onClick={() => handleResolveReport(r, 'resolved', true)}
                          disabled={busyReportId === r.id}
                          className="rounded-full bg-destructive-red/10 hover:bg-destructive-red/20 text-destructive-red border border-destructive-red/30 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                        >
                          <Ban size={13} /> Resolve & Ban
                        </button>
                        <button
                          onClick={() => handleResolveReport(r, 'dismissed')}
                          disabled={busyReportId === r.id}
                          className="rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-hairline px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                        >
                          <XCircle size={13} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>

                  <blockquote className="p-4 bg-surface-container/60 border-l-2 border-destructive-red rounded-r-xl text-sm text-on-surface calligraphic-italic">
                    "{r.messageContent}"
                  </blockquote>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 bg-surface-container/60 rounded-xl">
                      <span className="mono-micro-label text-on-surface-variant block">Reported User</span>
                      <span className="font-semibold text-on-surface">{r.reportedUser?.name || 'Unknown'}</span>
                      <span className="block text-[10px] text-on-surface-variant">{r.reportedUser?.email || ''}</span>
                    </div>
                    <div className="p-3 bg-surface-container/60 rounded-xl">
                      <span className="mono-micro-label text-on-surface-variant block">Reporter</span>
                      <span className="font-semibold text-on-surface">{r.reporterUser?.name || 'Unknown'}</span>
                    </div>
                    <div className="p-3 bg-surface-container/60 rounded-xl">
                      <span className="mono-micro-label text-on-surface-variant block">Reason</span>
                      <span className="text-primary font-semibold">{r.reason}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Broadcast composer */}
          <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline/50 pb-4">
              <h2 className="font-cormorant text-3xl font-normal text-on-surface flex items-center gap-2">
                <Megaphone size={18} className="text-primary" /> SMS Broadcast
              </h2>
              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                via GeezSMS
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Announcements are delivered straight to learner phones. Recipients are matched by level and must
              have a saved phone number. Amharic and English are supported.
            </p>

            <form onSubmit={handleBroadcast} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sms-audience" className="mono-micro-label text-on-surface-variant block">Audience</label>
                  <select
                    id="sms-audience"
                    value={smsForm.audienceLevel}
                    onChange={(e) => setSmsForm((prev) => ({ ...prev, audienceLevel: e.target.value }))}
                    className="mt-2 w-full px-3 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l === 'ALL' ? 'All Learners' : l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="w-full px-3 py-2.5 bg-surface-container/60 border border-hairline/50 rounded-xl flex items-center gap-2.5 text-xs font-mono text-on-surface-variant">
                    <Users size={15} className="text-primary shrink-0" />
                    {recipientCount === null ? (
                      <span>Counting recipients…</span>
                    ) : (
                      <span><span className="font-semibold text-on-surface">{recipientCount}</span> scholar{recipientCount === 1 ? '' : 's'} will receive this</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="sms-message" className="mono-micro-label text-on-surface-variant block">Message *</label>
                  <span className={`font-mono text-[10px] ${smsForm.message.length >= SMS_CHAR_LIMIT ? 'text-destructive-red' : 'text-on-surface-variant'}`}>
                    {smsForm.message.length}/{SMS_CHAR_LIMIT}
                  </span>
                </div>
                <textarea
                  id="sms-message"
                  value={smsForm.message}
                  onChange={(e) => setSmsForm((prev) => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  maxLength={SMS_CHAR_LIMIT}
                  placeholder="e.g. Reminder: today's Daily Exam closes at 8:00 PM EAT. Log in at ethio-lingo.com/exam"
                  className="mt-2 w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm text-on-surface outline-none focus:border-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!smsForm.message.trim() || sending}
                className="w-full sm:w-auto py-3 px-8 rounded-full bg-primary hover:bg-primary-container disabled:opacity-40 text-on-primary font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer btn-interactive focus-ring"
              >
                {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {sending ? 'Broadcasting…' : 'Broadcast via SMS'}
              </button>
            </form>
          </div>

          {/* Delivery history */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-cormorant text-3xl font-normal text-on-surface flex items-center gap-2">
                <Smartphone size={18} className="text-primary" /> Delivery History
              </h2>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-success-green">{sentCount} sent</span>
                <span className="font-mono text-[10px] text-destructive-red">{failedCount} failed</span>
                <button onClick={() => loadSmsLogs()} className="p-2 text-on-surface-variant hover:text-primary rounded-lg cursor-pointer focus-ring" aria-label="Refresh delivery history">
                  <RefreshCw size={15} className={loadingLogs ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <p className="p-6 text-center text-xs font-mono text-on-surface-variant animate-skeleton">Loading delivery history…</p>
            ) : smsLogs.length === 0 ? (
              <p className="p-10 text-center text-sm text-on-surface-variant font-mono">No SMS has been sent yet. Your first broadcast will appear here.</p>
            ) : (
              <div className="space-y-2.5">
                {smsLogs.map((log) => (
                  <div key={log.id} className="bg-surface-lowest border border-hairline/60 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider border shrink-0 ${
                      log.status === 'SENT'
                        ? 'bg-success-green/10 text-success-green border-success-green/30'
                        : 'bg-destructive-red/10 text-destructive-red border-destructive-red/30'
                    }">
                      {log.status}
                    </span>
                    <span className="font-mono text-[11px] text-on-surface shrink-0">{maskPhone(log.phone)}</span>
                    <span className="text-xs text-on-surface-variant font-light flex-1 min-w-[160px] truncate">
                      {log.message || '—'}
                    </span>
                    {log.error && <span className="font-mono text-[10px] text-destructive-red truncate max-w-[220px]">{log.error}</span>}
                    <span className="font-mono text-[10px] text-on-surface-variant shrink-0 ml-auto">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminCommunityPage;