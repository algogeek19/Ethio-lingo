import React from 'react';
import { motion } from 'framer-motion';

const StreakBadge = ({ count = 0, className = '' }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`${count} Day Continuous Learning Streak`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/60 border border-hairline/60 text-[11px] font-mono text-on-surface-variant font-medium cursor-default ${className}`}
      title={`${count} Day Continuous Learning Streak`}
    >
      <span className="text-tertiary text-xs">🔥</span>
      <span className="tracking-wide uppercase">
        {count} Day{count === 1 ? '' : 's'}
      </span>
    </motion.div>
  );
};

export default StreakBadge;