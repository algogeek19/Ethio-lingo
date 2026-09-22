import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Star, RefreshCw, CheckCircle2, Archive, BookOpen } from 'lucide-react';
import { api } from '../../services/api';

const STATUS_BADGE = {
  open: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  read: 'bg-warning-amber/15 text-warning-amber border-warning-amber/30',
  closed: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
};

const AdminFeedbackPage = () => {
  const [feedback, setFeedback] = useState([]);
  const [activeStatus, setActiveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (status = null) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getFeedback(status);
      if (res && res.success) setFeedback(res.data || []);
      else setError(res?.message || 'Failed to load feedback.');
    } catch (err) {
      setError(err.message || 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (item, status) => {
    setBusyId(item.id);
    setError('');
    setNotice('');
    try {
      const res = await api.updateFeedbackStatus(item.id, status);
      setNotice(res?.message || `Feedback marked as ${status}.`);
      load(activeStatus);
    } catch (err) {
      setError(err.message || 'Failed to update feedback.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <span className="px-2.5 py-0.5 bg-surface-dark text-warning-amber border border-stone-800 font-mono text-[10px] font-bold rounded-full uppercase">
            LEARNER FEEDBACK INBOX
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-2 tracking-tight">
            Feedback & Insights
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Review submissions from learners and triage them for action.
          </p>
        </div>
        <button
          onClick={() => load(activeStatus)}
          className="p-2.5 bg-surface-lowest border border-hairline hover:border-primary-coral text-on-surface rounded-xl cursor-pointer focus-ring"
          aria-label="Refresh feedback"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-700 dark:text-green-300 font-mono">{notice}</div>
      )}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 font-mono">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {[{ value: null, label: 'ALL' }, { value: 'open', label: 'OPEN' }, { value: 'read', label: 'READ' }, { value: 'closed', label: 'CLOSED' }].map(({ value, label }) => (
          <button
            key={label}
            onClick={() => { setActiveStatus(value); load(value); }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold border transition-all cursor-pointer focus-ring ${
              activeStatus === value
                ? 'bg-primary-coral text-white border-primary-coral'
                : 'bg-surface-card text-on-surface-variant border-hairline hover:border-primary-coral'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="md:col-span-2 p-10 text-center text-xs font-mono text-on-surface-variant animate-skeleton">Loading feedback...</p>
        ) : feedback.length === 0 ? (
          <p className="md:col-span-2 p-10 text-center text-sm text-on-surface-variant font-mono">No feedback submissions yet.</p>
        ) : (
          feedback.map((f) => (
            <div key={f.id} className="bg-surface-lowest border border-hairline rounded-2xl p-5 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-primary-coral/10 text-primary-coral font-mono text-[10px] font-bold rounded-lg uppercase border border-primary-coral/30">
                    {f.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${STATUS_BADGE[f.status] || STATUS_BADGE.open}`}>
                    {f.status}
                  </span>
                </div>
                {f.rating > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} className={i < f.rating ? 'text-warning-amber fill-warning-amber' : 'text-on-surface-variant'} />
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-on-surface leading-relaxed grow">{f.message}</p>

              <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {f.createdByName || 'Anonymous'} • {new Date(f.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {f.status !== 'read' && (
                    <button
                      onClick={() => updateStatus(f, 'read')}
                      disabled={busyId === f.id}
                      className="px-3 py-1.5 bg-warning-amber/15 hover:bg-warning-amber/25 text-warning-amber border border-warning-amber/30 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                    >
                      <BookOpen size={13} /> Mark Read
                    </button>
                  )}
                  {f.status !== 'closed' && (
                    <button
                      onClick={() => updateStatus(f, 'closed')}
                      disabled={busyId === f.id}
                      className="px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> Close
                    </button>
                  )}
                  {f.status === 'closed' && (
                    <button
                      onClick={() => updateStatus(f, 'open')}
                      disabled={busyId === f.id}
                      className="px-3 py-1.5 bg-surface-card hover:bg-surface-high text-on-surface-variant border border-hairline rounded-xl text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                    >
                      <Archive size={13} /> Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-surface-lowest border border-hairline rounded-2xl text-center">
        <span className="text-xs font-mono text-on-surface-variant flex items-center justify-center gap-2">
          <MessageSquare size={14} className="text-primary-coral" />
          {feedback.filter((f) => f.status === 'open').length} open item(s) awaiting review.
        </span>
      </div>
    </motion.div>
  );
};

export default AdminFeedbackPage;