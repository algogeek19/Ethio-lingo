import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Flag,
  Hash,
  Users,
  ShieldAlert,
  Megaphone,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useRole } from '../../context/RoleContext';

const REFRESH_MS = 8000;
const REASON_OPTIONS = ['Spam / Advertisement', 'Harassment', 'Offensive language', 'Scam or fraud', 'Inappropriate content', 'Other'];

const ChatPage = () => {
  const { authUser } = useRole();
  const [roomsData, setRoomsData] = useState(null);
  const [activeRoom, setActiveRoom] = useState('Daily Topic');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const bottomRef = useRef(null);
  const lastIdRef = useRef(null);

  const loadRooms = useCallback(async () => {
    try {
      const res = await api.getChatRooms();
      if (res && res.success && res.data) {
        setRoomsData(res.data);
        setActiveRoom((prev) => {
          if (res.data.rooms.some((r) => r.name === prev)) return prev;
          const joined = res.data.rooms.filter((r) => r.joined).map((r) => r.name);
          return joined[0] || 'Daily Topic';
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load chat rooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (room, initial = false) => {
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
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Full reload whenever the active room changes; then poll for new messages
  useEffect(() => {
    if (!activeRoom) return;
    lastIdRef.current = null;
    setError('');
    loadMessages(activeRoom, true);
    const interval = setInterval(() => loadMessages(activeRoom), REFRESH_MS);
    return () => clearInterval(interval);
  }, [activeRoom, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await api.postChatMessage(activeRoom, content);
      if (res && res.success && res.data) {
        setDraft('');
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

  const joinedRooms = (roomsData?.rooms || []).filter((r) => r.joined);
  const dailyTopic = roomsData?.dailyTopic || null;
  const isBannedUser = !!authUser?.isBanned;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {notice && (
        <div className="p-3.5 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-700 dark:text-green-300 font-mono flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 font-mono flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:opacity-70 cursor-pointer" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {isBannedUser && (
        <div className="p-4 bg-red-500/10 border-2 border-red-500/40 rounded-2xl text-sm text-center font-mono text-red-600 dark:text-red-300 flex items-center justify-center gap-2">
          <ShieldAlert size={18} />
          <span>Your account is banned from the community chat due to a moderation decision.</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-dark text-white rounded-2xl p-6 shadow-xl border border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-warning-amber uppercase tracking-wider font-bold flex items-center gap-1.5">
            <MessageCircle size={14} /> Community Chat Rooms
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white mt-1">Learn English Together</h1>
          <p className="text-xs text-stone-400 font-mono mt-0.5">
            Practice with learners at your level. Report abusive or spam messages to moderators.
          </p>
        </div>
        {dailyTopic && (
          <div className="flex flex-col items-end gap-2 max-w-xs text-right">
            <span className="px-3 py-1 bg-warning-amber text-stone-900 text-[11px] font-mono font-bold rounded-lg flex items-center gap-1.5 uppercase tracking-wider">
              <Megaphone size={13} /> Daily Topic
            </span>
            <p className="text-sm font-semibold text-warning-amber leading-snug">{dailyTopic.name}</p>
            <span className="text-[10px] text-stone-500 font-mono">{dailyTopic.date}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Room Sidebar */}
        <aside className="md:col-span-1 bg-surface-lowest border border-hairline rounded-2xl p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-on-surface-variant uppercase flex items-center gap-1.5">
              <Hash size={12} /> Rooms
            </span>
            <button onClick={loadRooms} className="p-1.5 text-on-surface-variant hover:text-primary-coral rounded-lg cursor-pointer focus-ring" aria-label="Refresh rooms">
              <RefreshCw size={13} />
            </button>
          </div>

          {loading && !roomsData ? (
            <div className="p-4 text-center text-xs text-on-surface-variant animate-skeleton">Loading rooms...</div>
          ) : (
            <div className="space-y-1.5">
              {joinedRooms.length === 0 && (
                <p className="text-xs text-on-surface-variant font-mono px-1">
                  No rooms unlocked yet. Your level room appears after placement.
                </p>
              )}
              {joinedRooms.map((room) => (
                <button
                  key={room.name}
                  onClick={() => setActiveRoom(room.name)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-ring ${
                    activeRoom === room.name
                      ? 'bg-primary-coral text-white shadow-xs'
                      : 'bg-surface-card text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Hash size={13} className={activeRoom === room.name ? 'text-white' : 'text-primary-coral'} />
                    {room.name}
                  </span>
                  {room.name === 'Daily Topic' && <span className="w-2 h-2 rounded-full bg-warning-amber animate-pulse" />}
                </button>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-hairline space-y-1.5 px-1 mt-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1.5"><Users size={12} /> Your Level</span>
              <span className="font-bold text-primary-coral">{roomsData?.userLevel || 'Beginner I'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <span>Track</span>
              <span className="font-bold">
                {roomsData?.isFreeTrial ? `Free Trial (${roomsData?.freeTrialDaysLeft ?? 3}d)` : 'Staked Escrow'}
              </span>
            </div>
          </div>
        </aside>

        {/* Message Board */}
        <section className="md:col-span-3 bg-surface-lowest border border-hairline rounded-2xl flex flex-col overflow-hidden h-[560px]">
          {/* Room Header */}
          <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-surface-card/50">
            <div>
              <h2 className="font-serif font-bold text-base text-on-surface flex items-center gap-2">
                <Hash size={15} className="text-primary-coral" /> {activeRoom}
              </h2>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Discuss today's topic, ask questions, and help each other improve.
              </p>
            </div>
            {/* Free Trial room label */}
            {activeRoom === 'Free Trial' && (
              <span className="px-2.5 py-1 bg-warning-amber/20 text-warning-amber text-[10px] font-mono font-bold rounded-lg uppercase">
                Trial Learners Only
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="grow overflow-y-auto px-5 py-4 space-y-3 bg-surface-lowest">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                <MessageCircle size={36} className="text-on-surface-variant/40" />
                <p className="text-xs font-mono text-on-surface-variant">No messages yet in this room.</p>
                <p className="text-[11px] text-on-surface-variant">Start the conversation for {dailyTopic?.name || activeRoom}!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.user && authUser && m.user.id === authUser.id;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMine && (
                      <div className="w-8 h-8 rounded-full bg-surface-card border border-hairline flex items-center justify-center shrink-0 text-[11px] font-bold text-primary-coral overflow-hidden">
                        {m.user && m.user.name ? m.user.name[0].toUpperCase() : '?'}
                      </div>
                    )}
                    <div className={`max-w-[75%] space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isMine && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                          <span className="font-bold text-on-surface">{m.user?.name}</span>
                          <span className="px-1.5 py-0.5 bg-surface-card border border-hairline rounded text-[9px] uppercase">
                            {m.user?.level || 'Learner'}
                          </span>
                        </div>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                          isMine
                            ? 'bg-primary-coral text-white rounded-br-md'
                            : 'bg-surface-card border border-hairline text-on-surface rounded-bl-md'
                        }`}
                      >
                        {m.content}
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[9px] font-mono text-on-surface-variant">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isMine && (
                          <button
                            onClick={() => setReportTarget(m)}
                            title="Report this message"
                            className="flex items-center gap-1 text-[9px] font-mono text-on-surface-variant hover:text-destructive-red cursor-pointer focus-ring rounded px-0.5 transition-colors"
                          >
                            <Flag size={10} /> Report
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSend} className="border-t border-hairline p-3.5 bg-surface-card/50 flex items-center gap-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              disabled={isBannedUser || sending}
              placeholder={isBannedUser ? 'Chat access revoked' : `Message ${activeRoom}...`}
              className="grow px-4 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending || isBannedUser}
              className="px-4 py-2.5 bg-primary-coral hover:bg-primary-hover disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer btn-interactive focus-ring"
            >
              {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReportTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-surface-lowest border border-hairline rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="px-2.5 py-0.5 bg-destructive-red/15 text-destructive-red font-mono text-[10px] font-bold rounded uppercase">
                    Report Message
                  </span>
                  <h3 className="font-serif font-bold text-lg text-on-surface">Why are you reporting this?</h3>
                </div>
                <button onClick={() => setReportTarget(null)} className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <blockquote className="p-3 bg-surface-card border border-hairline rounded-xl text-xs text-on-surface-variant italic">
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
                        ? 'bg-primary-coral text-white border-primary-coral font-semibold'
                        : 'bg-surface-lowest text-on-surface border-hairline hover:border-primary-coral'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={handleReport}
                disabled={!reportReason || reporting}
                className="w-full py-3 bg-destructive-red hover:bg-red-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer btn-interactive focus-ring"
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