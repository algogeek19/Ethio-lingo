import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Flag, CheckCircle2, Ban, XCircle, Megaphone, Plus, Trash2, Edit3, RefreshCw, Save } from 'lucide-react';
import { api } from '../../services/api';
import { useRole } from '../../context/RoleContext';

const LEVELS = ['ALL', 'Free Trial', 'Beginner I', 'Beginner II', 'Intermediate I', 'Intermediate II', 'Advanced I', 'Advanced II'];

const AdminCommunityPage = () => {
  const { authUser } = useRole();
  const [tab, setTab] = useState('reports'); // 'reports' | 'announcements'
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Announcement form state
  const [annFormOpen, setAnnFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', audienceLevel: 'ALL', isActive: true });
  const [savingAnn, setSavingAnn] = useState(false);
  const [busyReportId, setBusyReportId] = useState(null);
  const [busyAnnId, setBusyAnnId] = useState(null);

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

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnn(true);
    setError('');
    try {
      const res = await api.getAdminAnnouncements();
      if (res && res.success) setAnnouncements(res.data || []);
      else setError(res?.message || 'Failed to load announcements.');
    } catch (err) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoadingAnn(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadAnnouncements();
  }, [loadReports, loadAnnouncements]);

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

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ title: '', content: '', audienceLevel: 'ALL', isActive: true });
    setAnnFormOpen(true);
  };

  const openEditForm = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title, content: a.content, audienceLevel: a.audienceLevel || 'ALL', isActive: a.isActive });
    setAnnFormOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || savingAnn) return;
    setSavingAnn(true);
    setError('');
    setNotice('');
    try {
      if (editingId) {
        const res = await api.updateAnnouncement(editingId, {
          title: form.title.trim(),
          content: form.content.trim(),
          audienceLevel: form.audienceLevel,
          isActive: form.isActive,
        });
        setNotice(res?.message || 'Announcement updated.');
      } else {
        const res = await api.createAnnouncement({
          title: form.title.trim(),
          content: form.content.trim(),
          audienceLevel: form.audienceLevel,
        });
        setNotice(res?.message || 'Announcement published.');
      }
      setAnnFormOpen(false);
      loadAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setSavingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement permanently?')) return;
    setBusyAnnId(id);
    setError('');
    setNotice('');
    try {
      const res = await api.deleteAnnouncement(id);
      setNotice(res?.message || 'Announcement deleted.');
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete announcement.');
    } finally {
      setBusyAnnId(null);
    }
  };

  const togglePublish = async (a) => {
    setBusyAnnId(a.id);
    setError('');
    setNotice('');
    try {
      const res = await api.updateAnnouncement(a.id, { isActive: !a.isActive });
      setNotice(res?.message || (a.isActive ? 'Announcement unpublished.' : 'Announcement published.'));
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: !a.isActive, title: x.title } : x)));
    } catch (err) {
      setError(err.message || 'Failed to update announcement.');
    } finally {
      setBusyAnnId(null);
    }
  };

  const badge = (status) =>
    status === 'open'
      ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
      : status === 'resolved'
        ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
        : 'bg-stone-500/15 text-stone-500 dark:text-stone-300 border-stone-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <span className="px-2.5 py-0.5 bg-surface-dark text-warning-amber border border-stone-800 font-mono text-[10px] font-bold rounded-full uppercase">
            MODERATION & COMMUNITY
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-2 tracking-tight">
            Community Moderation Center
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Review reported chat messages, manage user bans, and publish announcements.
          </p>
        </div>
        <button
          onClick={() => setTab(tab === 'reports' ? 'announcements' : 'reports')}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs focus-ring btn-interactive cursor-pointer bg-surface-lowest text-on-surface border border-hairline hover:border-primary-coral"
        >
          {tab === 'reports' ? <Megaphone size={15} /> : <ShieldAlert size={15} />}
          <span>{tab === 'reports' ? 'Switch to Announcements' : 'Switch to Chat Reports'}</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-700 dark:text-green-300 font-mono flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss"><XCircle size={14} /></button>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 font-mono flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss"><XCircle size={14} /></button>
        </div>
      )}

      {tab === 'reports' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-2xl text-on-surface flex items-center gap-2">
              <Flag size={18} className="text-destructive-red" /> Reported Chat Messages
            </h2>
            <button onClick={() => loadReports()} className="p-2 text-on-surface-variant hover:text-primary-coral rounded-lg cursor-pointer focus-ring" aria-label="Refresh reports">
              <RefreshCw size={15} className={loadingReports ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['open', 'resolved', 'dismissed'].map((s) => (
              <button
                key={s}
                onClick={() => { setActiveStatus(s); loadReports(s); }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-all cursor-pointer focus-ring ${
                  activeStatus === s
                    ? 'bg-primary-coral text-white border-primary-coral'
                    : 'bg-surface-card text-on-surface-variant border-hairline hover:border-primary-coral'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => { setActiveStatus(null); loadReports(null); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-all cursor-pointer focus-ring ${
                activeStatus === null
                  ? 'bg-primary-coral text-white border-primary-coral'
                  : 'bg-surface-card text-on-surface-variant border-hairline hover:border-primary-coral'
              }`}
            >
              ALL
            </button>
          </div>

          <div className="space-y-3">
            {loadingReports ? (
              <p className="p-6 text-center text-xs font-mono text-on-surface-variant animate-skeleton">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="p-10 text-center text-sm text-on-surface-variant font-mono">No reported messages match this filter. Stay vigilant! 🛡️</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${badge(r.status)}`}>{r.status}</span>
                      <span className="text-[11px] font-mono text-on-surface-variant">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    {r.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(r, 'resolved')}
                          disabled={busyReportId === r.id}
                          className="px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} /> Resolve
                        </button>
                        <button
                          onClick={() => handleResolveReport(r, 'resolved', true)}
                          disabled={busyReportId === r.id}
                          className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                        >
                          <Ban size={13} /> Resolve & Ban User
                        </button>
                        <button
                          onClick={() => handleResolveReport(r, 'dismissed')}
                          disabled={busyReportId === r.id}
                          className="px-3 py-1.5 bg-surface-card hover:bg-surface-high text-on-surface-variant border border-hairline rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                        >
                          <XCircle size={13} /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>

                  <blockquote className="p-3.5 bg-surface-card border-l-4 border-destructive-red rounded-lg text-sm text-on-surface italic">
                    "{r.messageContent}"
                  </blockquote>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-2.5 bg-surface-card/60 rounded-lg">
                      <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Reported User</span>
                      <span className="font-semibold text-on-surface">{r.reportedUser?.name || 'Unknown'}</span>
                      <span className="block text-[10px] text-on-surface-variant">{r.reportedUser?.email || ''}</span>
                    </div>
                    <div className="p-2.5 bg-surface-card/60 rounded-lg">
                      <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Reporter</span>
                      <span className="font-semibold text-on-surface">{r.reporterUser?.name || 'Unknown'}</span>
                    </div>
                    <div className="p-2.5 bg-surface-card/60 rounded-lg">
                      <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Reason</span>
                      <span className="text-primary-coral font-semibold">{r.reason}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif font-bold text-2xl text-on-surface flex items-center gap-2">
              <Megaphone size={18} className="text-warning-amber" /> Announcements
            </h2>
            <button
              onClick={openCreateForm}
              className="px-4 py-2.5 bg-primary-coral hover:bg-primary-hover text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer btn-interactive focus-ring"
            >
              <Plus size={15} /> New Announcement
            </button>
          </div>

          {loadingAnn ? (
            <p className="p-6 text-center text-xs font-mono text-on-surface-variant animate-skeleton">Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p className="p-10 text-center text-sm text-on-surface-variant font-mono">No announcements yet. Publish your first update!</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className={`bg-surface-lowest border rounded-2xl p-5 space-y-2 ${a.isActive ? 'border-hairline' : 'border-dashed border-stone-500/40 opacity-75'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-serif font-bold text-lg text-on-surface">{a.title}</h3>
                      <span className="px-2.5 py-0.5 bg-primary-coral/10 text-primary-coral font-mono text-[10px] font-bold rounded-lg uppercase border border-primary-coral/30">
                        {a.audienceLevel || 'ALL'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase ${a.isActive ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-stone-500/15 text-stone-500 dark:text-stone-300'}`}>
                        {a.isActive ? 'Published' : 'Unpublished'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePublish(a)} disabled={busyAnnId === a.id} className="p-2 text-on-surface-variant hover:text-warning-amber rounded-lg cursor-pointer focus-ring" title={a.isActive ? 'Unpublish' : 'Publish'}>
                        <RefreshCw size={14} />
                      </button>
                      <button onClick={() => openEditForm(a)} className="p-2 text-on-surface-variant hover:text-primary-coral rounded-lg cursor-pointer focus-ring" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} disabled={busyAnnId === a.id} className="p-2 text-on-surface-variant hover:text-destructive-red rounded-lg cursor-pointer focus-ring" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{a.content}</p>
                  <div className="text-[11px] font-mono text-on-surface-variant">
                    By {a.createdByName || (authUser?.name || 'Admin')} • {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Announcement form modal */}
          <AnimatePresence>
            {annFormOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setAnnFormOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-lg w-full bg-surface-lowest border border-hairline rounded-2xl p-6 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-xl text-on-surface">
                      {editingId ? 'Edit Announcement' : 'Publish Announcement'}
                    </h3>
                    <button onClick={() => setAnnFormOpen(false)} className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer" aria-label="Close">
                      <XCircle size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">Title *</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        maxLength={120}
                        placeholder="e.g. New Business English Vocabulary Pack"
                        className="mt-1.5 w-full px-4 py-2.5 bg-surface-card border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">Content *</label>
                      <textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        rows={4}
                        maxLength={2000}
                        placeholder="Describe the update..."
                        className="mt-1.5 w-full px-4 py-2.5 bg-surface-card border border-hairline rounded-xl text-sm text-on-surface focus-ring resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">Audience Level</label>
                        <select
                          value={form.audienceLevel}
                          onChange={(e) => setForm({ ...form, audienceLevel: e.target.value })}
                          className="mt-1.5 w-full px-3 py-2.5 bg-surface-card border border-hairline rounded-xl text-sm text-on-surface focus-ring"
                        >
                          {LEVELS.map((l) => (
                            <option key={l} value={l}>{l === 'ALL' ? 'All Learners' : l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2.5 text-sm font-semibold text-on-surface cursor-pointer pb-2.5">
                          <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            className="w-4 h-4 accent-[#e85d3f]"
                          />
                          Publish immediately
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!form.title.trim() || !form.content.trim() || savingAnn}
                      className="w-full py-3 bg-primary-coral hover:bg-primary-hover disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer btn-interactive focus-ring"
                    >
                      {savingAnn ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      {editingId ? 'Save Changes' : 'Publish Announcement'}
                    </button>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default AdminCommunityPage;