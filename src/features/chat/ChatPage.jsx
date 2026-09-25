import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Flag,
  ShieldAlert,
  Megaphone,
  X,
  RefreshCw,
  Search,
  MessageCircle,
  ChevronLeft,
  Users,
  Smile,
  Copy,
  ArrowDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { useRole } from '../../context/RoleContext';
import { DayDivider, EmojiQuickBar, ReadTicks } from './components/chatShared';
import { formatClock, dayLabel, dayKey } from './components/chatUtils';

const REFRESH_MS = 5000;
const REASON_OPTIONS = ['Spam / Advertisement', 'Harassment', 'Offensive language', 'Scam or fraud', 'Inappropriate content', 'Other'];

const AVATAR_SIZES = {
  sm: { wrapper: 'w-8 h-8', text: 'text-[11px]' },
  md: { wrapper: 'w-11 h-11', text: 'text-sm' },
};

const Avatar = ({ name, image, online, size = 'md' }) => {
  const s = AVATAR_SIZES[size] || AVATAR_SIZES.md;
  return (
    <div className="relative shrink-0">
      {image ? (
        <img src={image} alt={name} className={`${s.wrapper} rounded-full object-cover border border-hairline shadow-xs`} />
      ) : (
        <div className={`${s.wrapper} rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold ${s.text} shadow-inner`}>
          {(name || '?')[0].toUpperCase()}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success-green border-2 border-surface-lowest" />
      )}
    </div>
  );
};

const MessageRow = ({ message, isMine, showHeader, peer, onReport }) => {
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
      key={message.id}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
    >
      {!isMine && (
        <div className={showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'}>
          <Avatar name={peer?.name} image={peer?.image} size="sm" />
        </div>
      )}

      <div className={`max-w-[78%] flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}>
        {!isMine && showHeader && (
          <div className="flex items-center gap-1.5 pl-1">
            <span className="text-[10px] font-mono text-on-surface-variant font-bold">{peer?.name}</span>
            {peer?.level && (
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-mono font-bold uppercase text-primary">
                {peer.level}
              </span>
            )}
          </div>
        )}

        <div className={`px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm ${
          isMine
            ? 'bg-primary text-on-primary rounded-2xl rounded-br-md'
            : 'bg-surface-low text-on-surface rounded-2xl rounded-bl-md'
        }`}>
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

const ChatPage = () => {
  const { authUser } = useRole();
  const [peersData, setPeersData] = useState(null);
  const [peers, setPeers] = useState([]);
  const [activePeerId, setActivePeerId] = useState(null);
  const [chat, setChat] = useState(null); // { chatId, peer, messages }
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
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
  const pollRef = useRef(null);
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const loadPeers = useCallback(async () => {
    try {
      const res = await api.getDirectChatPeers();
      if (res && res.success && res.data) {
        setPeersData(res.data);
        setPeers(res.data.peers || []);
        const firstId = res.data.peers?.[0]?.id || null;
        setActivePeerId((prev) => (prev && res.data.peers.some((p) => p.id === prev) ? prev : firstId));
      }
    } catch (err) {
      setError(err.message || 'Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (peerId) => {
    if (!peerId) return;
    try {
      const res = await api.getDirectMessages(peerId);
      if (res && res.success && res.data) {
        setChat(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversation.');
    }
  }, []);

  useEffect(() => {
    loadPeers();
  }, [loadPeers]);

  // Open a conversation when the active peer changes, then poll for new messages
  useEffect(() => {
    if (!activePeerId) return;
    loadConversation(activePeerId);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadConversation(activePeerId);
      loadPeers();
    }, REFRESH_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activePeerId, loadConversation, loadPeers]);

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
  }, [chat?.messages?.length, activePeerId, atBottom]);

  const scrollToLatest = () => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setAtBottom(true);
  };

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const content = draft.trim();
    if (!content || sending || !activePeerId) return;
    setSending(true);
    setError('');
    try {
      const res = await api.postDirectMessage(activePeerId, content);
      if (res && res.success && res.data) {
        setDraft('');
        setShowEmoji(false);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setChat((prev) => ({
          ...prev,
          chatId: prev?.chatId || res.data.directChatId || null,
          messages: [...(prev?.messages || []), res.data],
        }));
        // Refresh the contact preview list
        loadPeers();
      }
    } catch (err) {
      setError(err.message || 'Failed to send message.');
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
    if (!reportReason || reporting || !reportTarget) return;
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

  const activePeer = chat?.peer || peers.find((p) => p.id === activePeerId) || null;
  const dailyTopic = peersData?.dailyTopic || null;
  const isBannedUser = !!authUser?.isBanned;
  const filteredPeers = peers.filter(
    (p) => !query || p.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      {notice && (
        <div className="p-3.5 bg-success-green/10 border border-success-green/30 rounded-xl text-xs text-success-green font-mono flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-error font-mono flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {isBannedUser && (
        <div className="p-4 bg-error/10 border border-error/40 rounded-2xl text-sm text-center font-mono text-error flex items-center justify-center gap-2">
          <ShieldAlert size={18} />
          <span>Your account is banned from messaging due to a moderation decision.</span>
        </div>
      )}

      {/* Messenger Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 border-b border-hairline/50 pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5">
            <MessageCircle size={14} /> Cohort Messenger · Level {peersData?.level || 'Learners'}
          </span>
          <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-1">Chat with Your Cohort</h1>
          <p className="text-xs text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
            Direct messages with learners at your level. Report abusive or spam messages to moderators.
          </p>
        </div>
        {dailyTopic && (
          <div className="flex flex-col items-end gap-1.5 max-w-xs text-right rounded-2xl bg-surface-lowest border border-hairline/60 shadow-sm px-4 py-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-warning-amber/15 text-warning-amber rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
              <Megaphone size={12} /> Today's Topic
            </span>
            <p className="font-cormorant text-lg font-medium text-on-surface leading-snug">{dailyTopic.name}</p>
            <span className="text-[10px] font-mono text-on-surface-variant">{dailyTopic.date}</span>
          </div>
        )}
      </div>

      {/* Messenger Shell */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] bg-surface-lowest border border-hairline/60 rounded-2xl overflow-hidden shadow-lg h-[680px]">
        {/* Contact Sidebar (WhatsApp / Telegram style) */}
        <aside className={`md:col-span-1 border-r border-hairline/50 flex flex-col bg-surface-low ${activePeerId && chat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-hairline/50 space-y-3">
            <span className="font-cormorant text-2xl font-medium text-on-surface block">Cohort Messenger</span>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-9 pr-8 py-2.5 bg-surface-container/60 rounded-full border border-hairline/50 text-sm text-on-surface focus-ring placeholder:text-on-surface-variant/70"
              />
              <button onClick={loadPeers} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-primary rounded-full cursor-pointer" aria-label="Refresh contacts">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Users size={12} /> {filteredPeers.length} Learner{filteredPeers.length === 1 ? '' : 's'} at your level
              </span>
            </div>
          </div>

          <div className="grow overflow-y-auto">
            {loading && peers.length === 0 ? (
              <div className="p-6 text-center text-xs text-on-surface-variant animate-skeleton">Loading contacts...</div>
            ) : filteredPeers.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <MessageCircle size={30} className="text-on-surface-variant/40 mx-auto" />
                <p className="text-xs font-mono text-on-surface-variant">No other learners at {peersData?.level || 'your level'} yet.</p>
                <p className="text-[11px] text-on-surface-variant/70">
                  Check back soon — new learners join daily!
                </p>
              </div>
            ) : (
              filteredPeers.map((peer) => {
                const isActive = peer.id === activePeerId;
                const lastMsg = peer.lastMessage;
                const preview = lastMsg ? (lastMsg.fromMe ? `You: ${lastMsg.content}` : lastMsg.content) : 'No messages yet';
                return (
                  <button
                    key={peer.id}
                    onClick={() => setActivePeerId(peer.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all cursor-pointer focus-ring border-b border-hairline/40 ${
                      isActive ? 'bg-primary/10 border-l-[3px] border-l-primary' : 'hover:bg-surface-container'
                    }`}
                  >
                    <Avatar name={peer.name} image={peer.image} online={!!lastMsg} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                          {peer.name}
                        </span>
                        {lastMsg && (
                          <span className="text-[9px] font-mono text-on-surface-variant shrink-0">
                            {dayLabel(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className={`text-xs truncate ${isActive ? 'text-primary/80' : 'text-on-surface-variant'}`}>
                          {preview}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Conversation Pane */}
        <section className={`md:col-span-1 flex flex-col overflow-hidden ${activePeerId && chat ? 'flex' : 'hidden md:flex'}`}>
          {/* Mobile back button */}
          <div className="md:hidden flex items-center gap-2 px-3 pt-3">
            <button
              onClick={() => setChat(null)}
              className="flex items-center gap-1 text-xs font-mono text-on-surface-variant hover:text-primary cursor-pointer"
            >
              <ChevronLeft size={15} /> Contacts
            </button>
          </div>

          {/* Conversation Header */}
          <div className="px-5 py-3 border-b border-hairline/50 flex items-center justify-between gap-3 bg-surface-low/60">
            {activePeer && (
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={activePeer.name} image={activePeer.image} online size="md" />
                <div className="min-w-0">
                  <h2 className="font-cormorant text-xl font-medium text-on-surface truncate flex items-center gap-2">
                    {activePeer.name}
                    {activePeer.level && (
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-mono font-bold uppercase text-primary">
                        {activePeer.level}
                      </span>
                    )}
                  </h2>
                  <p className="text-[10px] font-mono text-success-green font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-green inline-block animate-pulse" />
                    Active now
                  </p>
                </div>
              </div>
            )}
            {dailyTopic && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-warning-amber/10 border border-warning-amber/30 rounded-full text-[10px] font-mono text-warning-amber font-bold">
                <Megaphone size={12} />
                <span className="max-w-[180px] truncate">{dailyTopic.name}</span>
              </div>
            )}
          </div>

          {/* Empty conversation state */}
          {!activePeer ? (
            <div className="grow flex flex-col items-center justify-center text-center space-y-3 bg-surface-lowest">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MessageCircle size={30} />
              </div>
              <p className="text-sm font-mono text-on-surface-variant font-semibold">Select a contact to start chatting</p>
              <p className="text-xs text-on-surface-variant/70 max-w-xs">
                Discuss today's topic: <strong className="text-primary">{dailyTopic?.name || 'Daily Topic'}</strong>
              </p>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                ref={messagesRef}
                onScroll={handleMessagesScroll}
                className="relative grow overflow-y-auto px-4 py-4 bg-surface-lowest"
              >
                <div className="space-y-2.5">
                  {chat && chat.messages.length === 0 ? (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-14 h-14 rounded-full bg-surface-container text-on-surface-variant/60 flex items-center justify-center">
                        <MessageCircle size={26} />
                      </div>
                      <p className="text-xs font-mono text-on-surface-variant font-semibold">No messages yet.</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Greet <strong className="text-primary">{activePeer.name}</strong> and discuss today's topic!
                      </p>
                    </div>
                  ) : (
                    (chat?.messages || []).map((m, idx) => {
                      const isMine = m.user && authUser && m.user.id === authUser.id;
                      const prev = idx > 0 ? chat.messages[idx - 1] : null;
                      const showHeader = !prev || prev.user?.id !== m.user?.id;
                      const isNewDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                      return (
                        <React.Fragment key={m.id}>
                          {isNewDay && <DayDivider iso={m.createdAt} />}
                          <MessageRow
                            message={m}
                            isMine={isMine}
                            showHeader={showHeader}
                            peer={m.user || activePeer}
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
                      placeholder={isBannedUser ? 'Messaging revoked' : `Message ${activePeer.name}...`}
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
            </>
          )}
        </section>
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

export default ChatPage;