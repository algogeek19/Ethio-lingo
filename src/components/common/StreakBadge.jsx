import React from 'react';
import { motion } from 'framer-motion';

const StreakBadge = ({ count = 0, className = '' }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`${count} Day Continuous Learning Streak`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-streak-orange text-white text-xs font-semibold rounded-full shadow-xs border border-orange-400/40 cursor-default ${className}`}
      title={`${count} Day Continuous Learning Streak`}
    >
      <motion.span
        animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="inline-block text-sm"
      >
        🔥
      </motion.span>
      <span className="font-mono text-[11px] font-bold tracking-tight uppercase">
        {count} DAY STREAK
      </span>
    </motion.div>
  );
};

export default StreakBadge;
