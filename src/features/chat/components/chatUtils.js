export const QUICK_EMOJIS = ['😀', '😂', '😊', '😍', '👍', '🔥', '🎉', '🙏', '😮', '👏', '💪', '🤝'];

export const formatClock = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const dayLabel = (iso) => {
  try {
    const d = new Date(iso);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dStart = new Date(d);
    dStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round((start - dStart) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const dayKey = (iso) => {
  try {
    return new Date(iso).toDateString();
  } catch {
    return '';
  }
};