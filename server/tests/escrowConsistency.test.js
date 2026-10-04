/**
 * Escrow balance consistency.
 *
 * The reported symptom was a vault balance that reset to its initial value on
 * reload. These tests pin the server-side half: a missed-day penalty must be
 * charged at most once per calendar day, and the balance must never move in a
 * way the ledger does not account for — including across the repeated reads and
 * audits that happen on every authenticated request.
 *
 * These drive the real walletRepository through an in-memory stand-in for
 * prisma, so the repository code is genuinely exercised rather than replaced.
 *
 * The client-side half — a hardcoded 900.0 fallback on load, `|| 900` turning a
 * real zero into a phantom balance, and fabricated deductions written to
 * localStorage on failed writes — is React state with no headless harness in
 * this project yet, so it is covered by inspection plus the source guard in
 * scripts/check-ui-regressions.mjs.
 *
 * Run: node --test server/tests/escrowConsistency.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/config/database.js';
import * as stakingService from '../src/services/stakingService.js';

/* ------------------------------------------------------------------ fixtures */

const db = { users: new Map(), wallets: new Map(), ledger: [] };

prisma.user = {
  findUnique: async ({ where }) => db.users.get(where.id) || null,
  update: async ({ where, data }) => {
    const u = db.users.get(where.id);
    Object.assign(u, data);
    return u;
  },
};

prisma.wallet = {
  findUnique: async ({ where }) => db.wallets.get(where.userId) || null,
  // walletRepository.updateWallet always routes through upsert.
  upsert: async ({ where, update, create }) => {
    const existing = db.wallets.get(where.userId);
    if (existing) {
      Object.assign(existing, update);
      return existing;
    }
    const created = { id: `w-${db.wallets.size + 1}`, ...create };
    db.wallets.set(where.userId, created);
    return created;
  },
  update: async ({ where, data }) => {
    const w = db.wallets.get(where.userId);
    Object.assign(w, data);
    return w;
  },
  create: async ({ data }) => {
    const created = { id: `w-${db.wallets.size + 1}`, ...data };
    db.wallets.set(created.userId, created);
    return created;
  },
  findFirst: async () => null,
};

prisma.ledgerTransaction = {
  create: async ({ data }) => {
    db.ledger.push(data);
    return data;
  },
};

// syncLearnerModuleDay reads daily progress to decide whether a day was
// completed on an earlier date. No rows here means "not completed", which is
// what keeps the reload from advancing anything.
prisma.userDailyProgress = {
  findFirst: async () => null,
  findMany: async () => [],
};

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const seed = (stakedAmount, overrides = {}) => {
  db.users.set('u1', {
    id: 'u1',
    timezone: 'Africa/Addis_Ababa',
    level: 'Beginner I',
    currentDay: 1,
    isActive: true,
    status: 'ACTIVE',
  });
  db.wallets.set('u1', {
    id: 'w-1',
    userId: 'u1',
    stakedAmount,
    availableBalance: 0,
    totalPenalties: 0,
    totalPlatformFees: 0,
    platformFeePercent: 0,
    streakCount: 5,
    isFreeTrial: false,
    freeTrialDaysLeft: 0,
    lastCompletedDate: null,
    lastAuditedDate: null,
    ...overrides,
  });
  db.ledger.length = 0;
  return db.wallets.get('u1');
};

/* --------------------------------------------------------------------- tests */

test('a missed-day penalty is charged exactly once per day', async () => {
  seed(1000);

  const first = await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);
  assert.equal(first.stakedAmount, 920, 'first penalty deducts 80');

  // Reload / retry / double-click: must not deduct again today.
  const second = await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);
  assert.equal(second.stakedAmount, 920, 'a repeat call on the same day must be a no-op');

  await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);
  assert.equal(db.wallets.get('u1').stakedAmount, 920, 'still 920 after a third call');

  assert.equal(db.ledger.length, 1, 'only one penalty may reach the ledger');
  assert.equal(db.wallets.get('u1').totalPenalties, 80);
});

test('the penalty resets the streak and records the audit date', async () => {
  seed(1000, { streakCount: 9 });
  await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);

  const w = db.wallets.get('u1');
  assert.equal(w.streakCount, 0);
  assert.equal(w.lastAuditedDate, today(), 'this is what guards the next call today');
});

test('a zero-balance wallet cannot go negative', async () => {
  seed(0);
  const w = await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);
  assert.equal(w.stakedAmount, 0, 'balance floors at 0, never negative');
  assert.equal(w.streakCount, 0);
  assert.equal(db.ledger.length, 0, 'nothing is ledgered when there is nothing to take');
});

test('a stake smaller than the penalty drains to exactly zero', async () => {
  seed(30);
  const w = await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);
  assert.equal(w.stakedAmount, 0, 'takes what is there and stops');
  assert.equal(w.totalPenalties, 30, 'only the real deduction is recorded');
});

test('the balance survives a simulated reload unchanged', async () => {
  seed(1000);
  await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);

  // A reload fires the workspace read, the wallet read and the streak audit.
  // None of them may move the balance.
  await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);
  await stakingService.advanceUserStreak('u1');
  await stakingService.syncLearnerModuleDay('u1', 'Beginner I', false);
  await stakingService.applyMissedDayStreakBreakPenalty('u1', 80.0);

  assert.equal(db.wallets.get('u1').stakedAmount, 920, 'balance is stable across reloads');
});

test('advanceUserStreak does not move the balance', async () => {
  seed(615);
  await stakingService.advanceUserStreak('u1');
  assert.equal(db.wallets.get('u1').stakedAmount, 615, 'streak changes must not touch escrow');
  assert.equal(db.wallets.get('u1').streakCount, 6);
});

test('exam failure penalties accumulate across separate attempts', async () => {
  seed(1000);
  await stakingService.applyExamFailurePenalty('u1', 25.0);
  await stakingService.applyExamFailurePenalty('u1', 25.0);

  const w = db.wallets.get('u1');
  assert.equal(w.stakedAmount, 950, 'each failed attempt is a real, separate charge');
  assert.equal(w.totalPenalties, 50);
  assert.equal(db.ledger.length, 2);
});

test('a drained stake deactivates the account', async () => {
  seed(120);
  await stakingService.applyExamFailurePenalty('u1', 25.0);
  assert.equal(db.users.get('u1').status, 'PENDING_DEPOSIT', 'below the 100 ETB floor');
  assert.equal(db.users.get('u1').isActive, false);
});

test('a deposit credits the balance and records no platform fee', async () => {
  seed(0);
  await stakingService.processDeposit('u1', 1000.0, 'tx_test_1');

  const w = db.wallets.get('u1');
  assert.equal(w.stakedAmount, 1000, 'full stake credited');
  assert.equal(w.totalPlatformFees, 0, '0% platform fee');
  assert.equal(w.isFreeTrial, false);
  assert.equal(db.users.get('u1').status, 'ACTIVE');
  assert.equal(db.users.get('u1').currentDay, 1, 'deposit resets the module day');
});
