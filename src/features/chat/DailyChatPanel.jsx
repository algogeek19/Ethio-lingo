import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Flag, Megaphone, ShieldAlert, RefreshCw, X, Smile, Copy, ArrowDown } from 'lucide-react';
import { api } from '../../services/api';
import { useRole } from '../../context/RoleContext';
import { DayDivider, EmojiQuickBar, ReadTicks } from './components/chatShared';
import { formatClock, dayKey } from './components/chatUtils';

const REFRESH_MS = 8000;
const REASON_OPTIONS = ['Spam / Advertisement', 'Harassment', 'Offensive language', 'Scam or fraud', 'Inappropriate content', 'Other'];

const DailyChatPanel = ({ roomLevel = 'Daily Topic' }) => {
  const { authUser } = useRole();
  const room = roomLevel || 'Daily Topic';
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const bottomRef = useRef(null);
  const lastIdRef = useRef(null);
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const loadTopic = useCallback(async () => {
    try {
      const res = await api.getDailyChatTopic();
      if (res && res.success && res.data) setTopic(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load today\'s chat topic.');
    }
  }, []);

  const loadMessages = useCallback(async (initial = false) => {
    try {
      const res = await api.getChatMessages(room, initial ? null : lastIdRef.current);
      if (res && res.success && Array.isArray(res.data)) {
        setMessages((prev) => {
          if (initial) {
            lastIdRef.current = res.data.length ? res.data[res.data.length - 1].id : null;
            return res.data;
          }
          const known = new Set(prev.map((m) => m.id));
          const fresh = res.data.filter((m) => !known.has(m.id) && m.id !== lastIdRef.current);
          if (fresh.length) lastIdRef.current = fresh[fresh.length - 1].id;
          return [...prev, ...fresh];
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [room]);

  useEffect(() => {
    loadTopic();
  }, [loadTopic]);

  useEffect(() => {
    lastIdRef.current = null;
    setError('');
    setLoading(true);
    loadMessages(true);
    const interval = setInterval(() => loadMessages(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Auto-scroll to the latest message when new messages arrive (if already near the bottom)
  const handleMessagesScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  useEffect(() => {
    const el = messagesRef.current;
    if (el && atBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, atBottom]);

  const scrollToLatest = () => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setAtBottom(true);
  };

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await api.postChatMessage(room, content);
      if (res && res.success && res.data) {
        setDraft('');
        setShowEmoji(false);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setMessages((prev) => [...prev, res.data]);
        lastIdRef.current = res.data.id;
      }
    } catch (err) {
      const banned = err.message && err.message.toLowerCase().includes('banned');
      setError(err.message || 'Failed to send message.');
      if (banned) setNotice('Your account is banned from the community chat.');
    } finally {
      setSending(false);
    }
  };

  const handleDraftChange = (e) => {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 132) + 'px';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const addEmoji = (emoji) => {
    setDraft((d) => d + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 132) + 'px';
    }
  };

  const handleReport = async () => {
    if (!reportReason || reporting) return;
    setReporting(true);
    try {
      const res = await api.reportChatMessage(reportTarget.id, reportReason);
      setNotice(res?.message || 'Message reported. Our moderators will review it shortly.');
      setReportTarget(null);
      setReportReason('');
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setReporting(false);
    }
  };

  const isBannedUser = !!authUser?.isBanned;

  return (
    <div className="space-y-4">
      {notice && (
        <div className="p-3 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green font-mono flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-xl text-xs text-error font-mono flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {isBannedUser && (
        <div className="p-3.5 bg-error/10 border border-error/40 rounded-2xl text-xs text-center font-mono text-error flex items-center justify-center gap-2">
          <ShieldAlert size={16} />
          <span>Your account is banned from the community chat due to a moderation decision.</span>
        </div>
      )}

      {/* Daily Topic banner */}
      <div className="bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 grow">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Megaphone size={18} />
          </div>
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
              Daily Chat Topic — {room} Room
            </span>
            {topic ? (
              <>
                <h3 className="font-cormorant text-2xl font-medium text-on-surface leading-tight">{topic.name}</h3>
                {topic.date && <span className="text-[10px] font-mono text-on-surface-variant">{topic.date}</span>}
              </>
            ) : (
              <p className="text-sm text-on-surface-variant font-mono">Loading today's topic...</p>
            )}
          </div>
        </div>
        <LinkToChat />
      </div>

      {/* Message Board */}
      <div className="bg-surface-lowest border border-hairline/60 rounded-2xl flex flex-col overflow-hidden h-[560px] shadow-sm">
        <div className="px-5 py-3 border-b border-hairline/50 bg-surface-low/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-cormorant text-lg font-medium text-on-surface flex items-center gap-2">
              <MessageCircle size={15} className="text-primary" /> Daily Chat Lounge
            </h2>
            <p className="text-[10px] font-mono text-on-surface-variant">
              Practice today's topic with learners at your level.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-success-green/10 text-success-green rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" />
              Live
            </span>
            <button onClick={() => loadMessages(true)} className="p-1.5 text-on-surface-variant hover:text-primary rounded-full cursor-pointer focus-ring" aria-label="Refresh chat">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div ref={messagesRef} onScroll={handleMessagesScroll} className="relative grow overflow-y-auto px-5 py-4 bg-surface-lowest">
          <div className="space-y-2.5">
            {loading && messages.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center space-y-2 animate-skeleton">
                <MessageCircle size={36} className="text-on-surface-variant/40" />
                <p className="text-xs font-mono text-on-surface-variant">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-surface-container text-on-surface-variant/60 flex items-center justify-center">
                  <MessageCircle size={26} />
                </div>
                <p className="text-xs font-mono text-on-surface-variant font-semibold">No messages yet in the Daily Topic room.</p>
                <p className="text-[11px] text-on-surface-variant">
                  Start the conversation for <strong className="text-primary">{topic?.name || room}</strong>!
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMine = m.user && authUser && m.user.id === authUser.id;
                const prev = idx > 0 ? messages[idx - 1] : null;
                const showHeader = !prev || prev.user?.id !== m.user?.id;
                const isNewDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                return (
                  <React.Fragment key={m.id}>
                    {isNewDay && <DayDivider iso={m.createdAt} />}
                    <BubbleRow
                      message={m}
                      isMine={isMine}
                      showHeader={showHeader}
                      onReport={setReportTarget}
                    />
                  </React.Fragment>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Scroll-to-latest FAB */}
          <AnimatePresence>
            {!atBottom && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 8 }}
                onClick={scrollToLatest}
                className="absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full bg-primary hover:bg-primary-container text-on-primary shadow-lg flex items-center justify-center cursor-pointer focus-ring"
                aria-label="Scroll to latest messages"
              >
                <ArrowDown size={17} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="border-t border-hairline/50 px-4 py-3 bg-surface-low/60 space-y-2">
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <EmojiQuickBar onPick={addEmoji} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowEmoji((v) => !v)}
              aria-label="Toggle emoji picker"
              title="Emoji"
              className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer focus-ring ${
                showEmoji
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-surface-low border-hairline text-on-surface-variant hover:text-primary hover:border-primary/40'
              }`}
            >
              <Smile size={18} />
            </button>
            <div className="relative grow">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={1000}
                disabled={isBannedUser || sending}
                placeholder={isBannedUser ? 'Chat access revoked' : `Message the ${room} room...`}
                className="w-full resize-none px-4 py-2.5 pr-14 bg-surface-low rounded-full border border-hairline/50 text-sm text-on-surface focus-ring disabled:opacity-50 leading-relaxed max-h-32 overflow-y-auto"
              />
              <span className="absolute bottom-2 right-3 text-[9px] font-mono text-on-surface-variant/50 pointer-events-none select-none">
                {draft.length}/1000
              </span>
            </div>
            <motion.button
              type="submit"
              whileTap={!draft.trim() || sending ? {} : { scale: 0.92 }}
              disabled={!draft.trim() || sending || isBannedUser}
              className="shrink-0 px-5 h-10 bg-primary hover:bg-primary-container disabled:opacity-40 text-on-primary rounded-full text-xs tracking-wider uppercase font-semibold flex items-center gap-2 transition-all cursor-pointer btn-interactive focus-ring"
            >
              {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span className="hidden sm:inline">Send</span>
            </motion.button>
          </div>
        </form>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReportTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-surface-lowest border border-hairline rounded-2xl p-8 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 bg-error/10 text-error font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Report Message
                  </span>
                  <h3 className="font-cormorant text-2xl font-normal text-on-surface">Why are you reporting this?</h3>
                </div>
                <button onClick={() => setReportTarget(null)} className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-full cursor-pointer" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <blockquote className="p-3 bg-surface-low border border-hairline rounded-xl text-xs text-on-surface-variant italic">
                "{reportTarget.content}"
              </blockquote>

              <div className="space-y-2">
                {REASON_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReportReason(r)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all cursor-pointer focus-ring ${
                      reportReason === r
                        ? 'bg-primary text-on-primary border-primary font-semibold'
                        : 'bg-surface-low text-on-surface border-hairline hover:border-primary'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={handleReport}
                disabled={!reportReason || reporting}
                className="w-full py-3 bg-error hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-full text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer btn-interactive focus-ring"
              >
                {reporting ? <RefreshCw size={14} className="animate-spin" /> : <Flag size={14} />}
                Submit Report to Moderators
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BubbleRow = ({ message, isMine, showHeader, onReport }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group flex gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
    >
      {!isMine && (
        <div className={`w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[11px] font-bold shadow-xs overflow-hidden transition-opacity ${showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {message.user && message.user.name ? message.user.name[0].toUpperCase() : '?'}
        </div>
      )}
      <div className={`max-w-[75%] space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMine && showHeader && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-[10px] font-mono font-bold text-on-surface">{message.user?.name}</span>
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-mono font-bold uppercase text-primary">
              {message.user?.level || 'Learner'}
            </span>
          </div>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
            isMine
              ? 'bg-primary text-on-primary rounded-br-md'
              : 'bg-surface-low text-on-surface rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
        {/* Timestamp + hover actions */}
        <div className={`flex items-center gap-2 px-1 transition-opacity ${isMine ? 'justify-end' : 'justify-start'} md:opacity-70 md:group-hover:opacity-100`}>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-on-surface-variant">
            {formatClock(message.createdAt)}
            {isMine && <ReadTicks />}
          </span>
          <button
            onClick={handleCopy}
            title="Copy message"
            className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant hover:text-primary cursor-pointer focus-ring rounded px-0.5 transition-colors"
          >
            {copied ? <span className="text-success-green font-bold">✓</span> : <Copy size={10} />}
          </button>
          {!isMine && (
            <button
              onClick={() => onReport(message)}
              title="Report this message"
              className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant hover:text-error cursor-pointer focus-ring rounded px-0.5 transition-colors"
            >
              <Flag size={10} /> Report
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const LinkToChat = () => (
  <Link
    to="/chat"
    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs tracking-wider uppercase font-semibold rounded-full transition-all shadow-sm focus-ring btn-interactive shrink-0"
  >
    <MessageCircle size={15} />
    <span>Open Full Chat →</span>
  </Link>
);

export default DailyChatPanel;