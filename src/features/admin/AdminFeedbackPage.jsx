import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Star, RefreshCw, CheckCircle2, Archive, BookOpen } from 'lucide-react';
import { api } from '../../services/api';

const STATUS_BADGE = {
  open: 'bg-destructive-red/10 text-destructive-red',
  read: 'bg-warning-amber/10 text-warning-amber',
  closed: 'bg-success-green/10 text-success-green',
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
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 py-10 space-y-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline/50 pb-6">
        <div>
          <span className="mono-micro-label text-primary">LEARNER FEEDBACK INBOX</span>
          <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2">
            Feedback & Insights
          </h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Review submissions from learners and triage them for action.
          </p>
        </div>
        <button
          onClick={() => load(activeStatus)}
          className="w-11 h-11 rounded-full bg-surface-container text-on-surface border border-hairline hover:bg-surface-container-high flex items-center justify-center transition-all cursor-pointer focus-ring"
          aria-label="Refresh feedback"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green font-mono">{notice}</div>
      )}
      {error && (
        <div className="p-3.5 bg-destructive-red/10 border border-destructive-red/30 rounded-xl text-xs text-destructive-red font-mono">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {[{ value: null, label: 'ALL' }, { value: 'open', label: 'OPEN' }, { value: 'read', label: 'READ' }, { value: 'closed', label: 'CLOSED' }].map(({ value, label }) => (
          <button
            key={label}
            onClick={() => { setActiveStatus(value); load(value); }}
            className={`rounded-full px-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer focus-ring ${
              activeStatus === value
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container text-on-surface-variant border-hairline hover:border-primary'
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
            <div key={f.id} className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-primary/10 text-primary rounded uppercase tracking-wider border border-primary/30">
                    {f.category}
                  </span>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider border ${STATUS_BADGE[f.status] || STATUS_BADGE.open}`}>
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

              <div className="flex items-center justify-between gap-2 border-t border-hairline/50 pt-4">
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {f.createdByName || 'Anonymous'} • {new Date(f.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {f.status !== 'read' && (
                    <button
                      onClick={() => updateStatus(f, 'read')}
                      disabled={busyId === f.id}
                      className="rounded-full bg-warning-amber/10 hover:bg-warning-amber/20 text-warning-amber border border-warning-amber/30 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                    >
                      <BookOpen size={13} /> Mark Read
                    </button>
                  )}
                  {f.status !== 'closed' && (
                    <button
                      onClick={() => updateStatus(f, 'closed')}
                      disabled={busyId === f.id}
                      className="rounded-full bg-success-green/10 hover:bg-success-green/20 text-success-green border border-success-green/30 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> Close
                    </button>
                  )}
                  {f.status === 'closed' && (
                    <button
                      onClick={() => updateStatus(f, 'open')}
                      disabled={busyId === f.id}
                      className="rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-hairline px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer focus-ring disabled:opacity-50"
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

      <div className="p-4 bg-surface-lowest border border-hairline/60 rounded-2xl shadow-sm text-center">
        <span className="mono-micro-label text-on-surface-variant flex items-center justify-center gap-2">
          <MessageSquare size={14} className="text-primary" />
          {feedback.filter((f) => f.status === 'open').length} open item(s) awaiting review.
        </span>
      </div>
    </motion.div>
  );
};

export default AdminFeedbackPage;