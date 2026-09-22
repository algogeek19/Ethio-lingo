/**
 * Server-side secure date calculation utilities for user timezones.
 */

/**
 * Get current date YYYY-MM-DD in the user's saved timezone.
 * Defaults to 'Africa/Addis_Ababa'.
 */
export const getUserTodayStr = (userTimezone = 'Africa/Addis_Ababa') => {
  try {
    const options = { timeZone: userTimezone || 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(new Date()); // Formats as YYYY-MM-DD
  } catch (err) {
    // Fallback to UTC date string
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Calculate difference in full calendar days between two YYYY-MM-DD strings.
 * Returns date1 - date2 in calendar days.
 */
export const calendarDaysBetween = (dateStr1, dateStr2) => {
  if (!dateStr1 || !dateStr2) return 0;
  try {
    const d1 = new Date(dateStr1 + 'T00:00:00Z');
    const d2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = d1.getTime() - d2.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch (err) {
    return 0;
  }
};
