/**
 * Curriculum shape constants.
 *
 * These were previously restated as bare literals in a dozen places, and they
 * had already drifted: the Free Trial track is 7 seeded modules, and the
 * exam/workspace paths allowed 7 days, while account creation and the streak
 * audit still cut the trial off at 3. A learner could therefore be penalised as
 * "expired" while still on day 1 of a 7-day track.
 *
 * Single source of truth so the length is stated once.
 */

/** Days in a main curriculum level. */
export const MODULE_DAYS = 30;

/**
 * Days in the Free Trial track. Matches FREE_TRIAL_MODULE_TOPICS in
 * server/prisma/seed.js, which seeds 7 modules.
 */
export const FREE_TRIAL_DAYS = 7;

/** Active level key used for every Free Trial learner's progress rows. */
export const FREE_TRIAL_LEVEL = 'Free Trial';

/**
 * The six-level curriculum, in order. Used for level progression on completing
 * the final module of a level.
 */
export const LEVEL_TRACKS = [
  'Beginner I',
  'Beginner II',
  'Intermediate I',
  'Intermediate II',
  'Advanced I',
  'Advanced II',
];

/** Total days across the whole curriculum, for display copy. */
export const TOTAL_CURRICULUM_DAYS = MODULE_DAYS * LEVEL_TRACKS.length;

/** Days remaining in the trial for a learner on `currentDay`. */
export const freeTrialDaysRemaining = (currentDay) =>
  Math.max(0, FREE_TRIAL_DAYS - (currentDay - 1));

/** True once a trial learner has reached the end of the track. */
export const isFreeTrialComplete = (currentDay) => currentDay >= FREE_TRIAL_DAYS;

/** The maximum day number for a given track. */
export const maxDayForTrack = (isFreeTrial) => (isFreeTrial ? FREE_TRIAL_DAYS : MODULE_DAYS);
