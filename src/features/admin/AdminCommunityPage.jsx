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
            Review reported chat messages, manage user bans, and publish announcements.
          </p>
        </div>
        <button
          onClick={() => setTab(tab === 'reports' ? 'announcements' : 'reports')}
          className="rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high text-xs tracking-wider uppercase font-semibold px-5 py-2.5 transition-all flex items-center gap-2 focus-ring btn-interactive cursor-pointer"
        >
          {tab === 'reports' ? <Megaphone size={15} /> : <ShieldAlert size={15} />}
          <span>{tab === 'reports' ? 'Switch to Announcements' : 'Switch to Chat Reports'}</span>
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
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-cormorant text-3xl font-normal text-on-surface flex items-center gap-2">
              <Megaphone size={18} className="text-warning-amber" /> Announcements
            </h2>
            <button
              onClick={openCreateForm}
              className="rounded-full bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs tracking-wider uppercase px-5 py-2.5 transition-all flex items-center gap-2 cursor-pointer btn-interactive focus-ring"
            >
              <Plus size={15} /> New Announcement
            </button>
          </div>

          {loadingAnn ? (
            <p className="p-6 text-center text-xs font-mono text-on-surface-variant animate-skeleton">Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p className="p-10 text-center text-sm text-on-surface-variant font-mono">No announcements yet. Publish your first update!</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className={`bg-surface-lowest border rounded-2xl p-6 space-y-3 shadow-sm ${a.isActive ? 'border-hairline/60' : 'border-dashed border-hairline opacity-75'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-cormorant text-xl font-normal text-on-surface">{a.title}</h3>
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-primary/10 text-primary rounded uppercase tracking-wider border border-primary/30">
                        {a.audienceLevel || 'ALL'}
                      </span>
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${a.isActive ? 'bg-success-green/10 text-success-green' : 'bg-surface-container text-on-surface-variant'}`}>
                        {a.isActive ? 'Published' : 'Unpublished'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePublish(a)} disabled={busyAnnId === a.id} className="p-2 text-on-surface-variant hover:text-warning-amber rounded-lg cursor-pointer focus-ring" title={a.isActive ? 'Unpublish' : 'Publish'}>
                        <RefreshCw size={14} />
                      </button>
                      <button onClick={() => openEditForm(a)} className="p-2 text-on-surface-variant hover:text-primary rounded-lg cursor-pointer focus-ring" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} disabled={busyAnnId === a.id} className="p-2 text-on-surface-variant hover:text-destructive-red rounded-lg cursor-pointer focus-ring" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{a.content}</p>
                  <div className="text-[11px] font-mono text-on-surface-variant border-t border-hairline/50 pt-3">
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
                className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setAnnFormOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 10 }}
                  onClick={(e) => e.stopPropagation()}
                  className="max-w-lg w-full bg-surface-lowest border border-hairline rounded-2xl p-8 shadow-2xl space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-cormorant text-2xl font-normal text-on-surface">
                      {editingId ? 'Edit Announcement' : 'Publish Announcement'}
                    </h3>
                    <button onClick={() => setAnnFormOpen(false)} className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer" aria-label="Close">
                      <XCircle size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                    <div>
                      <label className="mono-micro-label text-on-surface-variant block">Title *</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        maxLength={120}
                        placeholder="e.g. New Business English Vocabulary Pack"
                        className="mt-2 w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mono-micro-label text-on-surface-variant block">Content *</label>
                      <textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        rows={4}
                        maxLength={2000}
                        placeholder="Describe the update..."
                        className="mt-2 w-full px-3.5 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm text-on-surface outline-none focus:border-primary resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mono-micro-label text-on-surface-variant block">Audience Level</label>
                        <select
                          value={form.audienceLevel}
                          onChange={(e) => setForm({ ...form, audienceLevel: e.target.value })}
                          className="mt-2 w-full px-3 py-2.5 bg-surface-low border border-hairline rounded-xl text-sm text-on-surface outline-none focus:border-primary"
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
                            className="w-4 h-4 accent-primary"
                          />
                          Publish immediately
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!form.title.trim() || !form.content.trim() || savingAnn}
                      className="w-full py-3 rounded-full bg-primary hover:bg-primary-container disabled:opacity-40 text-on-primary font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer btn-interactive focus-ring"
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