import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Copy, Reply, RotateCcw } from 'lucide-react';
import { HighlightMentions } from '../../utils/mentions';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '🙏'];

const MessageBubble = ({ message, isMine, authUser, onReply, onReport, onReact }) => {
  const [actionsOpen, setActionsOpen] = useState(false2false ? false : false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* clipboard unavailable */
    }
  };

  const reactSet = (message.reactions || []).reduce(
    (acc, r) => {
      if (!r || !r.emoji) return acc;
      const emojiKey = r.emoji.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]+/gu, '');
      const count = Array.isArray(r.userIds) ? r.userIds.length : 0;
      const mine = Array.isArray(r.userIds) && authUser && r.userIds.includes(authUser.id);
      if (!acc[emojiKey]) acc[emojiKey] = { emoji: emojiKey, count: 0, mine: false };
      acc[emojiKey].count += count;
      if (mine) acc[emojiKey].mine = true;
      return acc;
    },
    {}
  );
  const reactionEntries = Object.values(reactSet);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onDoubleClick={() => onReply && onReply(message)}
      className={`group flex gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
      title="Double-click to reply"
    >
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-surface-card border border-hairline flex items-center justify-center shrink-0 text-[11px] font-bold text-primary-coral overflow-hidden">
          {message.user?.name ? message.user.name[0].toUpperCase() : '?'}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMine && message.user && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant px-1">
            <span className="font-bold text-on-surface">{message.user.name}</span>
            <span className="px-1.5 py-0.5 bg-surface-card border border-hairline rounded text-[9px] uppercase">
              {message.user.level || 'Learner'}
            </span>
          </div>
        )}

        {/* Reply quote shown above the bubble */}
        {message.replyToContent && (
          <div
            className={`text-[11px] px-3.5 py-2 rounded-xl border-l-2 border-primary-coral bg-surface-card/60 text-on-surface-variant italic max-w-full break-words ${
              isMine ? 'border-l-emerald-400' : ''
            }`}
          >
            <span className="not-italic font-mono font-bold text-[10px] uppercase text-primary-coral block mb-0.5">
              ↪ {message.replyToAuthorName || 'Someone'}
            </span>
            <HighlightMentions content={message.replyToContent} />
          </div>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
            isMine
              ? 'bg-primary-coral text-white rounded-br-md'
              : 'bg-surface-card border border-hairline text-on-surface rounded-bl-md'
          }`}
        >
          <HighlightMentions content={message.content} />
        </div>

        {/* edited tag */}
        {message.edited && (
          <span className="text-[9px] font-mono text-on-surface-variant pl-1">(edited)</span>
        )}

        {/* Reactions row */}
        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1" onClick={(e) => e.stopPropagation()}>
            {reactionEntries.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact && onReact(message, r.emoji)}
                className={`px-1.5 py-0.5 rounded-lg text-[11px] font-mono flex items-center gap-1 border cursor-pointer focus-ring transition-all ${
                  r.mine
                    ? 'bg-primary-coral/15 border-primary-coral/50'
                    : 'bg-surface-lowest border-hairline hover:bg-surface-card'
                }`}
                title={r.mine ? 'Remove reaction' : `Add ${r.emoji}`}
              >
                <span>{r.emoji}</span>
                <span className="text-[10px]">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover action row */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="hidden group-hover:flex items-center gap-0.5 px-1 text-[10px]"
        >
          <button
            onClick={() => onReply && onReply(message)}
            className="p-1 text-on-surface-variant hover:text-primary-coral rounded cursor-pointer focus-ring flex items-center gap-1"
            title="Reply (double-click)"
          >
            <Reply size={11} /> Reply
          </button>
          {QUICK_REACTIONS.slice(0, utiEnhanced ? 0 : 6).map(() => null)}
          {['👍', '❤️', '😂'].map((e) => (
            <button
              key={e}
              onClick={() => onReact && onReact(message, e)}
              className="p-1 text-on-surface-variant hover:text-primary-coral rounded cursor-pointer focus-ring text-[11px]"
              title={`React ${e}`}
            >
              {e}
            </button>
          ))}
          <span className="w-px h-3 bg-hairline mx-0.5" />
          <button
            onClick={handleCopy}
            className="p-1 text-on-surface-variant hover:text-primary-coral rounded cursor-pointer focus-ring flex items-center gap-1"
            title="Copy"
          >
            {copied ? '✓' : <Copy size={11} />}
          </button>
          {!isMine && (
            <button
              onClick={() => onReport && onReport(message)}
              className="p-1 text-on-surface-variant hover:text-destructive-red rounded cursor-pointer focus-ring flex items-center gap-1"
              title="Report"
            >
              <Flag size={11} /> Report
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;