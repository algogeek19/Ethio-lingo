import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Copy, Reply, Trash2, Pencil, X } from 'lucide-react';
import { useRole } from '../../../context/RoleContext';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '🙏'];
const REASONS = ['Spam / Advertisement', 'Harassment', 'Offensive language', 'Scam or fraud', 'Inappropriate content', 'Other'];

const renderQuoted = (content) => {
  /* Highlight @UserName tokens so replies/quotes read naturally */
  const parts = String(content || '').split(/(@[A-Za-z 0-9'\-\.\u1200-\u137F]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-primary-coral font-semibold">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

const MessageBubble = ({
  message,
  isMine,
  onReply,
  onReport,
  onEdit,
  onDelete,
  onCopy,
  onToggleReaction,
}) => {
  const { authUser } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  // Flatten reactions to [{ emoji, text: "Me, Alex", count, mine }]
  const reactions = (message.reactions || []).map((r) => {
    const userIds = Array.isArray(r.userIds) ? r.userIds : [];
    return {
      emoji: r.emoji,
      count: userIds.length,
      mine: !!authUser && userIds.includes(authUser.id),
      reactedBy: userIds.length,
    };
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* clipboard unavailable */
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason || reporting) return;
    setReporting(true);
    try {
      await onReport(message, reportReason);
      setShowReport(false);
      setReportReason('');
    } catch (e) {
      /* parent surfaces error */
    } finally {
      setReporting(false);
    }
  };

  const innerQuote =
    message.replyToContent || message.replyToAuthorName
      ? {
          author: message.replyToAuthorName || message.replyToContentAuthorName || 'Someone',
          content: message.replyToContent || '',
        }
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      onDoubleClick={() => onReply && onReply(message)}
      className={`group flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
      title="Double-click to reply"
    >
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-surface-card border border-hairline flex items-center justify-center shrink-0 text-[12px] font-bold text-primary-coral overflow-hidden">
          {message.user?.name ? message.user.name[0].toUpperCase() : '?'}
        </div>
      )}

      <div className={`max-w-[76%] space-y-1.5 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMine && (
          <span className="text-[10px] font-mono text-on-surface-variant flex items-center gap-1.5 pl-1">
            <span className="font-bold text-on-surface">{message.user?.name || 'Learner'}</span>
            <span className="px-1.5 py-0.5 bg-surface-card border border-hairline rounded text-[9px] font-bold uppercase">
              {message.user?.level || 'Learner'}
            </span>
          </span>
        )}

        {/* Reply quote shown above the bubble */}
        {innerQuote && (
          <div
            onClick={() => onReply && onReply(message)}
            className="max-w-full text-left px-3.5 py-2 rounded-xl border-l-2 border-primary-coral bg-surface-card/70"
            title="Reply"
          >
            <span className="block text-[10px] font-mono font-bold text-primary-coral flex items-center gap-1.5">
              <Reply size={11} /> {innerQuote.author}
            </span>
            <span className="block text-[11px] text-on-surface-variant italic mt-0.5 break-words line-clamp-2">
              {renderQuoted(innerQuote.content)}
            </span>
          </div>
        )}

        {/* Main message bubble */}
        <motion.div
          layout
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full shadow-xs ${
            isMine
              ? 'bg-primary-coral text-white rounded-br-md'
              : 'bg-surface-card border border-hairline text-on-surface rounded-bl-md'
          }`}
        >
          {renderQuoted(message.content)}
          {message.edited && (
            <span className={`text-[10px] font-mono ml-1.5 ${isMine ? 'text-white/70' : 'text-on-surface-variant'}`}>
              (edited)
            </span>
          )}
        </motion.div>

        {/* Emoji reactions row */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onToggleReaction && onToggleReaction(message, r.emoji)}
                title={r.mine ? `Remove ${r.emoji}` : `React ${r.emoji}`}
                className={`px-2 py-0.5 rounded-full text-[11px] border font-mono flex items-center gap-1 cursor-pointer transition-all focus-ring ${
                  r.mine
                    ? 'bg-primary-coral/20 border-primary-coral text-primary-coral'
                    : 'bg-surface-card border-hairline text-on-surface-variant hover:border-primary-coral'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover action row */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 text-on-surface-variant hover:text-primary-coral rounded cursor-pointer focus-ring"
            title="More actions"
          >
            <MoreHorizontal size={13} />
          </button>
          <span className="text-[9px] font-mono text-on-surface-variant">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Expanded action menu + quick reactions */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-1 px-2 py-1.5 bg-surface-lowest border border-hairline rounded-xl shadow-lg"
            >
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onToggleReaction && onToggleReaction(message, e);
                  }}
                  className="p-1.5 text-base hover:scale-125 transition-transform cursor-pointer focus-ring rounded"
                  title={`React ${e}`}
                >
                  {e}
                </button>
              ))}
              <span className="w-px h-4 bg-hairline mx-0.5" />
              <button onClick={() => { onReply && onReply(message); setMenuOpen(false); }} className="p-1.5 text-on-surface-variant hover:text-primary-coral cursor-pointer focus-ring rounded" title="Reply">
                <Reply size={14} />
              </button>
              <button onClick={handleCopy} className="p-1.5 text-on-surface-variant hover:text-primary-coral cursor-pointer focus-ring rounded" title="Copy">
                {copied ? <span className="text-[12px] font-mono text-success-green">✓</span> : <Copy size={14} />}
              </button>
              {isMine && onEdit && (
                <button onClick={() => { onEdit(message); setMenuOpen(false); }} className="p-1.5 text-on-surface-variant hover:text-primary-coral cursor-pointer focus-ring rounded" title="Edit">
                  <Pencil size={14} />
                </button>
              )}
              {isMine && onDelete && (
                <button onClick={() => { onDelete(message); setMenuOpen(false); }} className="p-1.5 text-on-surface-variant hover:text-destructive-red cursor-pointer focus-ring rounded" title="Delete">
                  <Trash2 size={14} />
                </button>
              )}
              {!isMine && onReport && (
                <button onClick={() => { setShowReport(true); setMenuOpen(false); }} className="p-1.5 text-on-surface-variant hover:text-destructive-red cursor-pointer focus-ring rounded" title="Report">
                  <Flag size={14} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowReport(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-surface-lowest border border-hairline rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 bg-destructive-red/15 text-destructive-red font-mono text-[10px] font-bold rounded uppercase">
                    Report Message
                  </span>
                  <h3 className="font-serif font-bold text-lg text-on-surface mt-2">Why are you reporting this?</h3>
                </div>
                <button onClick={() => setShowReport(false)} className="p-1.5 hover:opacity-70 cursor-pointer focus-ring rounded" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <blockquote className="p-3 bg-surface-card border border-hairline rounded-xl text-xs text-on-surface-variant italic">
                "{message.content}"
              </blockquote>

              <div className="space-y-2">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReportReason(r)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all cursor-pointer focus-ring ${
                      reportReason === r
                        ? 'bg-primary-coral text-white border-primary-coral font-semibold'
                        : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary-coral'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={handleReportSubmit}
                disabled={!reportReason || reporting}
                className="w-full py-3 bg-destructive-red hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer focus-ring"
              >
                {reporting ? 'Submitting...' : 'Submit Report to Moderators'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MessageBubble;
