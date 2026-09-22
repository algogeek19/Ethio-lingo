// Format currency values with JetBrains Mono style
export const formatETB = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0).replace('ETB', 'ETB ');
};

// Calculate time remaining in 30-day cycle
export const getRemainingCycleTime = (targetDate) => {
  const total = Date.parse(targetDate) - Date.parse(new Date());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    total: Math.max(0, total),
    days: days < 10 ? `0${Math.max(0, days)}` : `${Math.max(0, days)}`,
    hours: hours < 10 ? `0${Math.max(0, hours)}` : `${Math.max(0, hours)}`,
    minutes: minutes < 10 ? `0${Math.max(0, minutes)}` : `${Math.max(0, minutes)}`,
    seconds: seconds < 10 ? `0${Math.max(0, seconds)}` : `${Math.max(0, seconds)}`,
  };
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
