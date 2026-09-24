import React from 'react';
import { CheckCheck } from 'lucide-react';
import { QUICK_EMOJIS, dayLabel } from './chatUtils';

/** WhatsApp-style "Today / Yesterday / date" separator row between message groups. */
export const DayDivider = ({ iso }) => (
  <div className="flex items-center justify-center gap-3 py-3 select-none" aria-hidden="true">
    <span className="h-px w-10 bg-hairline" />
    <span className="px-2.5 py-1 rounded-full bg-surface-card border border-hairline text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider shadow-xs">
      {dayLabel(iso)}
    </span>
    <span className="h-px w-10 bg-hairline" />
  </div>
);

/** Double check-mark "read" indicator rendered inside our own message bubbles. */
export const ReadTicks = () => <CheckCheck size={12} className="text-white/90" aria-label="Sent" />;

/** Compact horizontal emoji quick-bar shown above the composer. */
export const EmojiQuickBar = ({ onPick }) => (
  <div className="flex items-center gap-0.5 flex-wrap px-1 pb-1">
    {QUICK_EMOJIS.map((e) => (
      <button
        key={e}
        type="button"
        onClick={() => onPick(e)}
        className="w-7 h-7 rounded-lg text-base hover:bg-surface-high hover:scale-110 active:scale-95 transition-all cursor-pointer focus-ring flex items-center justify-center"
        aria-label={`Insert ${e}`}
      >
        {e}
      </button>
    ))}
  </div>
);