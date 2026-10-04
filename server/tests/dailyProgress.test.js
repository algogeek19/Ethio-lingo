/**
 * Regression test for daily-task persistence and day rollover.
 *
 * Reproduces the two reported bugs against the real service code with an
 * in-memory stand-in for Postgres:
 *
 *   1. A completed task reverted to "incomplete" after leaving and returning,
 *      because the read path resolved the day from the server while the write
 *      path trusted the client's day, so the completion was written to a row
 *      that nothing read back.
 *   2. Progress writes silently degrading to an in-process mock when the
 *      database threw, reporting success for work that was never persisted.
 *
 * Run: node --test server/tests/dailyProgress.test.js
 *   (or) node server/tests/dailyProgress.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/config/database.js';
import * as progressRepository from '../src/repositories/progressRepository.js';
import * as workspaceService from '../src/services/workspaceService.js';

/* ------------------------------------------------------------------ fixtures */

// Minimal in-memory stand-in for the tables these services touch. Only the
// fields the code under test actually reads are modelled.
const db = {
  users: new Map(),
  wallets: new Map(),
  progress: [],
};

const seedUser = (overrides = {}) => {
  const user = {
    id: 'u1',
    role: 'learner',
    level: 'Beginner I',
    currentDay: 1,
    timezone: 'Africa/Addis_Ababa',
    ...overrides,
  };
  db.users.set(user.id, user);
  return user;
};

const seedWallet = (userId, overrides = {}) => {
  const wallet = {
    userId,
    stakedAmount: 1000,
    totalPenalties: 0,
    totalPlatformFees: 0,
    streakCount: 0,
    isFreeTrial: false,
    freeTrialDaysLeft: 0,
    lastCompletedDate: null,
    lastAuditedDate: null,
    ...overrides,
  };
  db.wallets.set(userId, wallet);
  return wallet;
};

// Route every prisma call the services make into the in-memory store.
prisma.user = {
  findUnique: async ({ where }) => db.users.get(where.id) || null,
  update: async ({ where, data }) => {
    const user = db.users.get(where.id);
    Object.assign(user, data);
    return user;
  },
};
prisma.wallet = {
  findUnique: async ({ where }) => db.wallets.get(where.userId) || null,
  upsert: async ({ where, update, create }) => {
    const existing = db.wallets.get(where.userId);
    if (existing) {
      Object.assign(existing, update);
      return existing;
    }
    const created = { ...create };
    db.wallets.set(where.userId, created);
    return created;
  },
  findFirst: async () => null,
};
prisma.userDailyProgress = {
  findFirst: async ({ where }) =>
    db.progress.find(
      (r) =>
        r.userId === where.userId &&
        r.level === where.level &&
        r.dayNumber === where.dayNumber &&
        r.progressDate === where.progressDate
    ) || null,
  create: async ({ data }) => {
    const row = { id: `p${db.progress.length + 1}`, ...data };
    db.progress.push(row);
    return row;
  },
  update: async ({ where, data }) => {
    const row = db.progress.find((r) => r.id === where.id);
    Object.assign(row, data);
    return row;
  },
};
// Used only to assert the "no silent fallback" behaviour.
prisma.curriculumModule = { findUnique: async () => null, findMany: async () => [] };

const today = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const reset = () => {
  db.users.clear();
  db.wallets.clear();
  db.progress.length = 0;
};

/* --------------------------------------------------------------------- tests */

test('a completed task survives leaving and returning', async () => {
  reset();
  seedUser();
  seedWallet('u1');

  // Learner finishes Task 1 on day 1.
  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'lesson');

  // "Leaves and comes back later" — a brand new read, as a fresh page load does.
  const onReturn = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 1);

  assert.equal(
    onReturn.progress.task1LessonCompleted,
    true,
    'Task 1 must still read as complete after returning'
  );
  assert.equal(onReturn.progress.task2ListeningCompleted, false);
});

test('all three tasks read back complete, so the dashboard ring is full', async () => {
  reset();
  seedUser();
  seedWallet('u1');

  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'lesson');
  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'video');
  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'exam', { passed: true, score: 20 });

  const { progress, currentDay } = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 1);

  assert.equal(currentDay, 1, 'must still be day 1 on the same calendar day');
  assert.equal(progress.task1LessonCompleted, true, 'lesson badge');
  assert.equal(progress.task2ListeningCompleted, true, 'video badge');
  assert.equal(progress.examCompleted && progress.examPassed, true, 'exam badge');
});

test('completing a later task does not clear an earlier one', async () => {
  reset();
  seedUser();
  seedWallet('u1');

  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'lesson');
  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'exam', { passed: true, score: 18 });

  const { progress } = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 1);
  assert.equal(progress.task1LessonCompleted, true, 'lesson flag must survive the exam write');
  assert.equal(progress.examPassed, true);
});

test('a stale client day writes to the row the read path uses', async () => {
  reset();
  seedUser({ currentDay: 2 });
  seedWallet('u1');

  // The client still believes it is on day 1 and sends day 1.
  await workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'lesson');

  // The server is authoritative and reads day 2, so that is where the read
  // happens — and the completion must be visible there.
  const { currentDay, progress } = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 2);
  assert.equal(currentDay, 2);
  assert.equal(
    progress.task1LessonCompleted,
    true,
    'server day must win on write too, or the completion is orphaned'
  );
});

test('a failed write throws instead of silently reporting success', async () => {
  reset();
  seedUser();
  seedWallet('u1');

  const original = prisma.userDailyProgress.create;
  prisma.userDailyProgress.create = async () => {
    throw new Error('database unavailable');
  };
  prisma.userDailyProgress.findFirst = async () => null;

  await assert.rejects(
    () => workspaceService.updateTaskCompletion('u1', 'Beginner I', 1, 'lesson'),
    /database unavailable/,
    'must surface the failure so the client can roll back its optimistic tick'
  );

  prisma.userDailyProgress.create = original;
  prisma.userDailyProgress.findFirst = async ({ where }) =>
    db.progress.find(
      (r) =>
        r.userId === where.userId &&
        r.level === where.level &&
        r.dayNumber === where.dayNumber &&
        r.progressDate === where.progressDate
    ) || null;
});

test('a write with no level falls back to the user\'s saved level, not Beginner I', async () => {
  reset();
  // Learner is on Beginner II; a client that omits `level` used to write the
  // completion under "Beginner I" while the read resolved "Beginner II".
  seedUser({ level: 'Beginner II', currentDay: 1 });
  seedWallet('u1');

  await workspaceService.updateTaskCompletion('u1', undefined, 1, 'lesson');

  const { progress } = await workspaceService.getDailyWorkspaceData('u1', undefined, 1);
  assert.equal(
    progress.task1LessonCompleted,
    true,
    'level must resolve identically on read and write'
  );
});

test('the day advances by one on the next calendar day after a pass', async () => {
  reset();
  seedUser({ currentDay: 1 });
  // Yesterday's exam was passed, so the rollover should move to day 2.
  seedWallet('u1', { lastCompletedDate: '2000-01-01' });
  db.progress.push({
    id: 'pyesterday',
    userId: 'u1',
    level: 'Beginner I',
    dayNumber: 1,
    progressDate: '2000-01-01',
    task1LessonCompleted: true,
    task2ListeningCompleted: true,
    examCompleted: true,
    examPassed: true,
    examScore: 18,
    examAttempts: 1,
  });

  const { currentDay } = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 1);
  assert.equal(currentDay, 2, 'exactly one day per rollover');
  assert.equal(db.users.get('u1').currentDay, 2, 'persisted to the user row');

  // Idempotent: reading again must not advance a second time.
  const second = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 2);
  assert.equal(second.currentDay, 2, 'must not advance twice for the same date');
});