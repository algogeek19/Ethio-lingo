import React from 'react';

export const StreakBadge = ({ count, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c] text-white text-xs font-semibold rounded-full shadow-xs ${className}`}
      title={`${count} Day Continuous Learning Streak`}
    >
      <span className="animate-bounce">🔥</span>
      <span className="font-mono tracking-tight">{count} DAY STREAK</span>
    </div>
  );
};
