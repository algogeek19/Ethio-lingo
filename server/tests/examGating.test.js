/**
 * Exam gating and grading integrity.
 *
 * The exam path resolved the level and day from the request body while the
 * workspace read/write paths resolved them server-side. That is the same
 * orphaning defect fixed for completeTask, but on the route learners actually
 * use, plus a grading-integrity problem: getExamPassThreshold read the client's
 * level, and a higher level has a LOWER bar (15/20 Beginner vs 13/20
 * Intermediate), so the request could influence the grade.
 *
 * Run: node --test server/tests/examGating.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/config/database.js';
import * as examService from '../src/services/examService.js';
import * as workspaceService from '../src/services/workspaceService.js';

/* ------------------------------------------------------------------ fixtures */

const db = { users: new Map(), wallets: new Map(), progress: [], questions: [], attempts: [], ledger: [] };

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
  upsert: async ({ where, update, create }) => {
    const existing = db.wallets.get(where.userId);
    if (existing) {
      Object.assign(existing, update);
      return existing;
    }
    const created = { id: 'w-1', ...create };
    db.wallets.set(where.userId, created);
    return created;
  },
  // Required: walletRepository.updateWallet calls prisma.wallet.update, and a
  // missing stub makes safeDbQuery silently fall back to its in-memory map, so
  // the deduction appears to succeed while the stored balance never changes.
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
prisma.userDailyProgress = {
  findFirst: async ({ where }) => {
    const hit = db.progress.find(
      (r) =>
        r.userId === where.userId &&
        r.level === where.level &&
        r.dayNumber === where.dayNumber &&
        (where.progressDate === undefined || r.progressDate === where.progressDate)
    );
    return hit || null;
  },
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
prisma.questionBank = {
  findMany: async ({ where }) =>
    db.questions.filter((q) => (where?.id?.in ? where.id.in.includes(q.id) : true)),
};
prisma.examAttempt = {
  create: async ({ data }) => {
    const row = { id: `a${db.attempts.length + 1}`, createdAt: new Date(), ...data };
    db.attempts.push(row);
    return row;
  },
};
prisma.ledgerTransaction = {
  create: async ({ data }) => {
    db.ledger.push(data);
    return data;
  },
};

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

// 20 questions whose answerIndex is 0, so N correct answers == score N.
const seedQuestions = (level, day, count = 20) => {
  for (let i = 1; i <= count; i += 1) {
    db.questions.push({
      id: `${level}-d${day}-q${i}`,
      level,
      dayNumber: day,
      question: `Q${i}`,
      options: JSON.stringify(['A', 'B', 'C', 'D']),
      answerIndex: 0,
      explanation: 'because',
    });
  }
};

const seed = ({ level = 'Beginner I', day = 1, currentDay = 1, staked = 1000 } = {}) => {
  db.users.set('u1', {
    id: 'u1',
    email: 'u1@test',
    role: 'learner',
    timezone: 'Africa/Addis_Ababa',
    level,
    currentDay,
    isActive: true,
    status: 'ACTIVE',
  });
  db.wallets.set('u1', {
    id: 'w-1',
    userId: 'u1',
    stakedAmount: staked,
    availableBalance: 0,
    totalPenalties: 0,
    totalPlatformFees: 0,
    platformFeePercent: 0,
    streakCount: 0,
    isFreeTrial: false,
    freeTrialDaysLeft: 0,
    lastCompletedDate: null,
    lastAuditedDate: null,
  });
  db.progress.length = 0;
  db.questions.length = 0;
  db.attempts.length = 0;
};

/** Mark task1 + task2 done for the server's currentDay, as the workspace would. */
const completeVideoTasks = (level, day) => {
  db.progress.push({
    id: 'pv',
    userId: 'u1',
    level,
    dayNumber: day,
    progressDate: today(),
    task1LessonCompleted: true,
    task2ListeningCompleted: true,
    examCompleted: false,
    examScore: 0,
    examPassed: false,
    examAttempts: 0,
  });
};

/** Build an answer payload giving `correctCount` correct answers. */
const answers = (level, day, correctCount) =>
  Array.from({ length: 20 }, (_, i) => ({
    questionId: `${level}-d${day}-q${i + 1}`,
    selectedOption: i < correctCount ? 0 : 1,
  }));

/* --------------------------------------------------------------------- tests */

test('the exam is locked until both video tasks are complete', async () => {
  seed({ level: 'Beginner I', day: 1, currentDay: 1 });
  seedQuestions('Beginner I', 1);

  await assert.rejects(
    () => examService.getDailyExamQuestions('u1', 'Beginner I', 1),
    /locked/i,
    'no tasks done must be locked'
  );

  completeVideoTasks('Beginner I', 1);
  const qs = await examService.getDailyExamQuestions('u1', 'Beginner I', 1);
  assert.equal(qs.length, 20);
});

test('the gate checks the server day, not the day in the request', async () => {
  seed({ level: 'Beginner I', day: 1, currentDay: 2 });
  seedQuestions('Beginner I', 1);
  seedQuestions('Beginner I', 2);

  // Tasks are done for day 1 (a day the learner has already finished), but the
  // server says they are on day 2. Asking for day 1 must not unlock.
  completeVideoTasks('Beginner I', 1);
  await assert.rejects(
    () => examService.getDailyExamQuestions('u1', 'Beginner I', 1),
    /locked/i,
    'a finished day must not unlock the exam'
  );

  completeVideoTasks('Beginner I', 2);
  const qs = await examService.getDailyExamQuestions('u1', 'Beginner I', 2);
  assert.equal(qs.length, 20, 'the current day unlocks');
});

test('a pass writes to the row the workspace read path looks at', async () => {
  seed({ level: 'Beginner I', day: 1, currentDay: 1 });
  seedQuestions('Beginner I', 1);
  completeVideoTasks('Beginner I', 1);

  const res = await examService.submitExamAnswers('u1', 'Beginner I', 1, answers('Beginner I', 1, 18));
  assert.equal(res.passed, true);
  assert.equal(res.newStreak, 1);

  // This is the assertion that matters: the workspace read must see the exam.
  const { progress } = await workspaceService.getDailyWorkspaceData('u1', 'Beginner I', 1);
  assert.equal(progress.examPassed, true, 'exam tick must be visible to the dashboard');
  assert.equal(progress.examCompleted, true);
  assert.equal(progress.task1LessonCompleted, true, 'video tasks must survive');
  assert.equal(progress.task2ListeningCompleted, true);
});

test('a pass still counts when the client sends a stale level after a level-up', async () => {
  // The saved level has moved to Beginner II (a level-up just happened), but the
  // client still holds 'Beginner I' in its session and sends that. Writing the
  // result under the requested level put it on a row the workspace read never
  // looks at, so a genuinely passed exam read back as incomplete — the
  // "Action Required" badge on an exam the learner had actually passed.
  seed({ level: 'Beginner II', day: 1, currentDay: 1 });
  seedQuestions('Beginner II', 1);
  completeVideoTasks('Beginner II', 1);

  const res = await examService.submitExamAnswers(
    'u1',
    'Beginner I', // stale
    1,
    answers('Beginner II', 1, 18)
  );
  assert.equal(res.passed, true);

  const { progress } = await workspaceService.getDailyWorkspaceData('u1', undefined, 1);
  assert.equal(progress.examPassed, true, 'the pass must land on the saved level');
  assert.equal(progress.task1LessonCompleted, true);
  assert.equal(progress.task2ListeningCompleted, true);
});

test('a client-supplied level cannot lower the pass threshold', async () => {
  // Learner is a Beginner. Beginner needs 15/20; naming an Advanced level would
  // have selected a 13/20 bar (and 10/20 after 3 attempts) if the request were
  // trusted.
  seed({ level: 'Beginner I', day: 1, currentDay: 1 });
  seedQuestions('Beginner I', 1);
  seedQuestions('Advanced II', 1);
  completeVideoTasks('Beginner I', 1);

  // 14 correct: fails the real 15/20 Beginner bar.
  const spoofed = await examService.submitExamAnswers(
    'u1',
    'Advanced II',
    1,
    answers('Beginner I', 1, 14)
  );
  assert.equal(spoofed.passThreshold, 15, 'threshold must follow the saved level, not the request');
  assert.equal(spoofed.passed, false, 'a spoofed level must not turn a fail into a pass');

  // And the completion is recorded against the learner's real level.
  const { progress } = await workspaceService.getDailyWorkspaceData('u1', undefined, 1);
  assert.equal(progress.examPassed, false);
});

test('a failed exam charges the penalty once per attempt', async () => {
  seed({ level: 'Beginner I', day: 1, currentDay: 1, staked: 1000 });
  seedQuestions('Beginner I', 1);
  completeVideoTasks('Beginner I', 1);

  await examService.submitExamAnswers('u1', 'Beginner I', 1, answers('Beginner I', 1, 5));
  assert.equal(db.wallets.get('u1').stakedAmount, 975, 'first failure costs 25');

  await examService.submitExamAnswers('u1', 'Beginner I', 1, answers('Beginner I', 1, 6));
  assert.equal(db.wallets.get('u1').stakedAmount, 950, 'a second attempt is a real second charge');
});

test('each attempt is recorded for review', async () => {
  seed({ level: 'Beginner I', day: 1, currentDay: 1 });
  seedQuestions('Beginner I', 1);
  completeVideoTasks('Beginner I', 1);

  const res = await examService.submitExamAnswers('u1', 'Beginner I', 1, answers('Beginner I', 1, 18));
  assert.equal(res.attemptsTaken, 1);
  assert.equal(db.attempts.length, 1);
  assert.equal(db.attempts[0].passed, true);
});

test('the adaptive threshold relaxes only after three attempts', async () => {
  seed({ level: 'Beginner I', day: 1, currentDay: 1, staked: 5000 });
  seedQuestions('Beginner I', 1);
  completeVideoTasks('Beginner I', 1);

  const fail = () => examService.submitExamAnswers('u1', 'Beginner I', 1, answers('Beginner I', 1, 4));
  await fail();
  const second = await fail();
  assert.equal(second.passThreshold, 15, 'two attempts still means 15/20');
  await fail();
  const fourth = await examService.submitExamAnswers('u1', 'Beginner I', 1, answers('Beginner I', 1, 11));
  assert.equal(fourth.passThreshold, 10, 'the bar drops to 10/20 after three attempts');
  assert.equal(fourth.passed, true);
});

test('the pass threshold differs by level', () => {
  assert.equal(examService.getExamPassThreshold('Beginner I'), 15);
  assert.equal(examService.getExamPassThreshold('Beginner II'), 15);
  assert.equal(examService.getExamPassThreshold('Intermediate I'), 13);
  assert.equal(examService.getExamPassThreshold('Advanced II'), 13);
  assert.equal(examService.getExamPassThreshold('Beginner I', 3), 10);
});
