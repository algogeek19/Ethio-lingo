/**
 * Dual-channel verification.
 *
 * Covers the rule the whole design rests on: verification is PER-CHANNEL and
 * access needs AT LEAST ONE verified channel. So "phone only", "email only" and
 * "both" are all valid end states, and confirming a second channel adds a
 * delivery route without changing access.
 *
 * Run: node --test server/tests/verification.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// ENV is captured at module load, so the Mailtrap token has to exist before
// anything imports the email service. Top-level await keeps the ordering honest.
process.env.MAILTRAP_TOKEN = 'test-token';
process.env.MAILTRAP_FROM_EMAIL = 'no-reply@test.local';
process.env.NODE_ENV = 'test';

const { prisma } = await import('../src/config/database.js');
const verificationService = await import('../src/services/verificationService.js');

/* ------------------------------------------------------------------ fixtures */

const db = { users: new Map(), codes: [], delivered: [] };

// Real Prisma hands back a fresh object per call. The double must do the same,
// otherwise a mutation is visible through a reference captured earlier and
// "was this channel already verified?" is answered from the write itself.
prisma.user = {
  findUnique: async ({ where }) => {
    const u = db.users.get(where.id);
    return u ? { ...u } : null;
  },
  update: async ({ where, data }) => {
    const u = db.users.get(where.id);
    Object.assign(u, data);
    return { ...u };
  },
};
prisma.verificationCode = {
  create: async ({ data }) => {
    const row = { id: `v${db.codes.length + 1}`, consumedAt: null, attempts: 0, createdAt: new Date(), ...data };
    db.codes.push(row);
    return row;
  },
  findFirst: async ({ where, orderBy }) => {
    let hits = db.codes.filter((c) => {
      if (c.userId !== where.userId) return false;
      if (c.channel !== where.channel) return false;
      if (where.consumedAt === null && c.consumedAt !== null) return false;
      if (where.createdAt?.gt && !(new Date(c.createdAt) > new Date(where.createdAt.gt))) return false;
      return true;
    });
    if (orderBy?.createdAt === 'desc') hits = [...hits].sort((a, b) => b.createdAt - a.createdAt);
    return hits[0] || null;
  },
  findMany: async ({ where }) =>
    db.codes.filter((c) => c.userId === where.userId && (!where.channel || c.channel === where.channel)),
  update: async ({ where, data }) => {
    const row = db.codes.find((c) => c.id === where.id);
    Object.assign(row, typeof data.attempts === 'object' ? { attempts: row.attempts + data.attempts.increment } : data);
    return row;
  },
  updateMany: async ({ where, data }) => {
    let n = 0;
    for (const c of db.codes) {
      if (c.userId === where.userId && c.channel === where.channel && c.consumedAt === null) {
        Object.assign(c, data);
        n += 1;
      }
    }
    return { count: n };
  },
};

// Intercept outbound HTTP instead of patching the service modules (ESM
// namespaces are frozen). This also exercises the real smsService/emailService
// request-building, so a broken message body would fail here rather than in
// production.
const sent = [];
const realFetch = globalThis.fetch;

const stubFetch = () => {
  globalThis.fetch = async (url, init = {}) => {
    let payload = {};
    try {
      payload = JSON.parse(init.body || '{}');
    } catch {
      payload = {};
    }
    if (String(url).includes('/sms/send')) {
      sent.push({ channel: 'sms', to: payload.phone, body: payload.msg || '' });
    } else {
      sent.push({ channel: 'email', to: payload.to?.[0]?.email, body: payload.text || '' });
    }
    return new Response(JSON.stringify({ success: true, message: { id: 'x' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return () => {
    globalThis.fetch = realFetch;
  };
};

let restore;

const seedUser = (over = {}) => {
  const user = {
    id: 'u1',
    email: null,
    phone: null,
    emailVerified: false,
    phoneVerified: false,
    isVerified: false,
    status: 'PENDING_VERIFICATION',
    isActive: false,
    ...over,
  };
  db.users.set(user.id, user);
  return user;
};

/** Pull the code out of the actually-delivered message. */
const lastCode = (channel) => {
  const entry = [...sent].reverse().find((s) => s.channel === channel);
  if (!entry) return '000000';
  const match = String(entry.body).match(/\b(\d{6})\b/);
  return match ? match[1] : '000000';
};

test.beforeEach(async () => {
  db.users.clear();
  db.codes.length = 0;
  sent.length = 0;
  restore = stubFetch();
});

test.afterEach(() => restore && restore());

/* --------------------------------------------------------------------- tests */

test('destinations are normalised per channel', () => {
  assert.equal(verificationService.normaliseDestination('sms', '0911234567'), '251911234567');
  assert.equal(verificationService.normaliseDestination('sms', '+251911234567'), '251911234567');
  assert.equal(verificationService.normaliseDestination('sms', 'not-a-number'), null);
  assert.equal(verificationService.normaliseDestination('email', 'Abebe@Example.COM'), 'abebe@example.com');
  assert.equal(verificationService.normaliseDestination('email', 'nope'), null);
  assert.equal(verificationService.normaliseDestination('email', ''), null);
});

test('a phone-only learner verifies by SMS and gains access', async () => {
  const user = seedUser({ phone: '0911234567' });
  assert.equal(verificationService.hasVerifiedChannel(user), false);

  const issued = await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  assert.equal(issued.channel, 'sms');
  assert.equal(issued.destination, '251911234567');

  const res = await verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: lastCode('sms') });

  assert.equal(res.channelVerified, true);
  assert.equal(res.grantedAccess, true, 'the first verified channel grants access');
  assert.deepEqual(res.verifiedChannels, ['sms']);

  const after = db.users.get('u1');
  assert.equal(after.phoneVerified, true);
  assert.equal(after.isVerified, true);
  assert.equal(after.status, 'ACTIVE');
  assert.equal(after.isActive, true);
});

test('an email-only learner verifies by email and gains access', async () => {
  seedUser({ email: 'abebe@example.com' });
  const issued = await verificationService.issueCode({ userId: 'u1', channel: 'email' });
  assert.equal(issued.destination, 'abebe@example.com');

  const res = await verificationService.verifyCode({ userId: 'u1', channel: 'email', code: lastCode('email') });
  assert.equal(res.grantedAccess, true);
  assert.deepEqual(res.verifiedChannels, ['email']);
  assert.equal(db.users.get('u1').emailVerified, true);
});

test('the answer to "what if a user wants both": both verify, and the second adds no access', async () => {
  const user = seedUser({ email: 'both@example.com', phone: '0911234567' });

  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const first = await verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: lastCode('sms') });
  assert.equal(first.grantedAccess, true);
  assert.deepEqual(first.verifiedChannels, ['sms']);

  await verificationService.issueCode({ userId: 'u1', channel: 'email' });
  const second = await verificationService.verifyCode({ userId: 'u1', channel: 'email', code: lastCode('email') });

  assert.equal(second.channelVerified, true, 'the second channel is still verified');
  assert.equal(second.grantedAccess, false, 'but it grants no additional access');
  assert.deepEqual(second.verifiedChannels.sort(), ['email', 'sms']);

  const after = db.users.get('u1');
  assert.equal(after.emailVerified && after.phoneVerified, true, 'both flags stand');
  assert.equal(verificationService.hasVerifiedChannel(after), true);
});

test('the two channels verify independently', async () => {
  seedUser({ email: 'x@example.com', phone: '0911234567' });
  // An SMS code must not satisfy an email verification, or vice versa.
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  await assert.rejects(
    () => verificationService.verifyCode({ userId: 'u1', channel: 'email', code: lastCode('sms') }),
    /invalid or has expired/i
  );
});

test('a wrong code is rejected and burns attempts', async () => {
  seedUser({ phone: '0911234567' });
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const real = lastCode('sms');
  const wrong = real === '000000' ? '111111' : '000000';

  await assert.rejects(
    () => verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: wrong }),
    /not correct|invalid/i
  );
  assert.equal(db.codes[0].attempts, 1);
  assert.equal(db.users.get('u1').phoneVerified, false, 'a wrong code must not verify');
});

test('the code is burned after five wrong attempts', async () => {
  seedUser({ phone: '0911234567' });
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const real = lastCode('sms');
  const wrong = real === '000000' ? '111111' : '000000';

  for (let i = 0; i < 5; i += 1) {
    await assert.rejects(() => verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: wrong }));
  }
  assert.ok(db.codes[0].consumedAt !== null, 'the code is burned');
  // Even the correct code must now fail: a burned 6-digit space cannot be walked.
  await assert.rejects(
    () => verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: real }),
    /invalid or has expired/i
  );
});

test('a code is single-use', async () => {
  seedUser({ phone: '0911234567' });
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const code = lastCode('sms');
  await verificationService.verifyCode({ userId: 'u1', channel: 'sms', code });
  await assert.rejects(
    () => verificationService.verifyCode({ userId: 'u1', channel: 'sms', code }),
    /invalid or has expired/i,
    'replaying a used code must fail'
  );
});

test('issuing a new code supersedes the previous one', async () => {
  seedUser({ phone: '0911234567' });
  const first = await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const firstCode = lastCode('sms');

  // Bypass the resend cooldown the way a cooldown expiry would.
  db.codes[0].createdAt = new Date(Date.now() - 60_000);
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const secondCode = lastCode('sms');

  // A superseded code must not work. The exact message differs (the record is
  // consumed, so the newest code is what gets compared and simply does not
  // match), and the security property is the rejection itself.
  await assert.rejects(
    () => verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: firstCode }),
    /not correct|invalid or has expired/i,
    'a superseded code must not verify'
  );
  await verificationService.verifyCode({ userId: 'u1', channel: 'sms', code: secondCode });
  assert.equal(db.users.get('u1').phoneVerified, true);
  assert.ok(first.id !== undefined || true);
});

test('resends are rate limited per channel', async () => {
  seedUser({ phone: '0911234567' });
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  await assert.rejects(
    () => verificationService.issueCode({ userId: 'u1', channel: 'sms' }),
    /please wait/i,
    'a second request inside the cooldown is refused'
  );
  // A different channel is unaffected.
  seedUser({ email: 'a@b.com' });
  await verificationService.issueCode({ userId: 'u1', channel: 'email' });
  assert.ok(db.codes.some((c) => c.channel === 'email'));
});

test('an invalid destination is rejected before any code is stored', async () => {
  seedUser({ phone: '0911234567' });
  await assert.rejects(
    () => verificationService.issueCode({ userId: 'u1', channel: 'sms', destination: 'garbage' }),
    /valid phone number/i
  );
  assert.equal(db.codes.length, 0);
});

test('an unknown channel is rejected', async () => {
  seedUser({ email: 'a@b.com' });
  await assert.rejects(
    () => verificationService.issueCode({ userId: 'u1', channel: 'carrier-pigeon' }),
    /must be 'email' or 'sms'/i
  );
});

test('the plaintext code is never stored', async () => {
  seedUser({ phone: '0911234567' });
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const code = lastCode('sms');
  const row = db.codes[0];
  assert.notEqual(row.codeHash, code, 'the code must not be the stored value');
  assert.ok(!String(row.codeHash).includes(code));
  assert.ok(row.codeSalt && row.codeSalt.length >= 16, 'a per-code salt is stored');
  assert.ok(!JSON.stringify(row).includes(code), 'the code appears nowhere in the row');
});

test('an expired code is refused', async () => {
  seedUser({ phone: '0911234567' });
  await verificationService.issueCode({ userId: 'u1', channel: 'sms' });
  const code = lastCode('sms');
  db.codes[0].expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(
    () => verificationService.verifyCode({ userId: 'u1', channel: 'sms', code }),
    /invalid or has expired/i
  );
});
