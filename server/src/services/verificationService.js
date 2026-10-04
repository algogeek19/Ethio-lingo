import crypto from 'node:crypto';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import * as smsService from './smsService.js';
import * as emailService from './emailService.js';
import { normalizePhone } from './smsService.js';

/**
 * Channel-confirmation codes.
 *
 * Verification is per-channel and orthogonal to access: an account needs AT
 * LEAST ONE verified channel to use the product, and verifying a second channel
 * only adds a delivery route. That is what makes "phone only", "email only" and
 * "both" all valid end states rather than a special case.
 *
 * Codes are stored hashed, expire quickly, are single-use, and are burned after
 * a fixed number of wrong attempts.
 */

export const CHANNEL_EMAIL = 'email';
export const CHANNEL_SMS = 'sms';

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;

/** Cryptographically random 6-digit code. */
const generateCode = () => String(crypto.randomInt(100000, 1000000));

/** SHA-256 hex digest. A short numeric code needs no slow KDF. */
const hashCode = (code, salt) =>
  crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');

const normaliseChannel = (channel) => {
  const c = String(channel || '').trim().toLowerCase();
  if (c === CHANNEL_EMAIL || c === 'mail') return CHANNEL_EMAIL;
  if (c === CHANNEL_SMS || c === 'phone' || c === 'geezsms') return CHANNEL_SMS;
  throw new AppError("Verification channel must be 'email' or 'sms'.", 400);
};

/**
 * Validate and normalise a destination for a channel.
 * Returns null when the supplied value cannot be used for that channel, so
 * callers can decide whether to reject the signup or simply skip the channel.
 */
export const normaliseDestination = (channel, value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (channel === CHANNEL_SMS) return normalizePhone(raw);

  // Deliberately permissive but structural: something@something.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) return null;
  return raw.toLowerCase();
};

/** Both channels this user could receive a code on right now. */
export const channelsFor = (user) => {
  const out = [];
  const email = normaliseDestination(CHANNEL_EMAIL, user.email);
  if (email) out.push({ channel: CHANNEL_EMAIL, destination: email, verified: !!user.emailVerified });
  const phone = normaliseDestination(CHANNEL_SMS, user.phone);
  if (phone) out.push({ channel: CHANNEL_SMS, destination: phone, verified: !!user.phoneVerified });
  return out;
};

/** True when the account has at least one verified channel. */
export const hasVerifiedChannel = (user) => !!(user.emailVerified || user.phoneVerified);

/**
 * Issue a code for one channel, superseding any earlier unconsumed code.
 *
 * Delivery failure does NOT fail the call: the account must still be created and
 * the learner must still be able to resend. The failure is returned so callers
 * can surface it.
 */
export const issueCode = async ({ userId, channel: rawChannel, destination: rawDestination }) => {
  const channel = normaliseChannel(rawChannel);

  // Fall back to the contact already on the account so callers do not have to
  // know (or be trusted with) the value they are verifying.
  let raw = rawDestination;
  let userName = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      userName = user.name || null;
      if (!raw) raw = channel === CHANNEL_SMS ? user.phone : user.email;
    }
  }

  const destination = normaliseDestination(channel, raw);
  if (!destination) {
    throw new AppError(
      `A valid ${channel === CHANNEL_SMS ? 'phone number' : 'email address'} is required for ${channel} verification.`,
      400
    );
  }

  // Rate limit resends per user+channel so one client cannot burn the quota.
  const recent = await prisma.verificationCode.findFirst({
    where: {
      userId,
      channel,
      consumedAt: null,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - new Date(recent.createdAt).getTime())) / 1000
    );
    throw new AppError(`Please wait ${wait}s before requesting another ${channel} code.`, 429);
  }

  // Supersede the previous live code so only the newest one works.
  await prisma.verificationCode.updateMany({
    where: { userId, channel, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.verificationCode.create({
    data: {
      userId,
      channel,
      destination,
      codeHash: hashCode(code, salt),
      codeSalt: salt,
      expiresAt,
      attempts: 0,
    },
  });

  let delivery;
  try {
    delivery =
      channel === CHANNEL_SMS
        ? await smsService.sendSms({
            phone: destination,
            msg: `Your Ethio-Lingo verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
          })
        : await emailService.sendVerificationEmail({
            to: destination,
            name: userName,
            code,
            expiresMinutes: CODE_TTL_MINUTES,
          });
  } catch (err) {
    // No transport configured, or the provider rejected the request outright.
    logger.error(`Verification code delivery failed for ${channel}: ${err.message}`);
    delivery = { success: false, error: err.message };
  }

  return {
    channel,
    destination,
    expiresAt,
    delivered: !!delivery?.success,
    // Only outside production, and only so the workflow is testable before a
    // mailtrap token and sender domain exist.
    debugCode: ENV.NODE_ENV !== 'production' && !delivery?.success ? code : null,
    deliveryError: delivery?.success ? null : delivery?.error || 'Delivery failed',
  };
};

/**
 * Verify a submitted code and, on success, mark that channel verified.
 *
 * Access is granted on the FIRST verified channel; verifying a second one does
 * not change access, it only enables a second delivery route.
 */
export const verifyCode = async ({ userId, channel: rawChannel, code }) => {
  const channel = normaliseChannel(rawChannel);
  const submitted = String(code || '').trim();

  if (!/^\d{6}$/.test(submitted)) {
    throw new AppError('Enter the 6-digit verification code.', 400);
  }

  const record = await prisma.verificationCode.findFirst({
    where: { userId, channel, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  // One message for "no such code", "expired" and "already used" so the endpoint
  // cannot be used to probe which codes exist.
  const invalid = new AppError('That code is invalid or has expired. Request a new one.', 400);

  if (!record) throw invalid;
  if (new Date(record.expiresAt).getTime() < Date.now()) throw invalid;
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw invalid;
  }

  // Constant-time compare against the salted hash of the stored salt.
  const candidate = Buffer.from(hashCode(submitted, record.codeSalt), 'hex');
  const expected = Buffer.from(record.codeHash, 'hex');
  const matches =
    candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);

  if (!matches) {
    const updated = await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    if (updated.attempts >= MAX_ATTEMPTS) {
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
    }
    const left = Math.max(0, MAX_ATTEMPTS - updated.attempts);
    throw new AppError(
      left > 0 ? `That code is not correct. ${left} attempt${left === 1 ? '' : 's'} remaining.` : invalid.message,
      400
    );
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Account not found.', 404);

  const data =
    channel === CHANNEL_EMAIL
      ? { emailVerified: true }
      : { phoneVerified: true };

  // Whether the ACCOUNT had any verified channel before this one. Deliberately
  // account-wide rather than per-channel: confirming a second channel must not
  // re-run the access promotion, or a dual-verified learner would be "granted
  // access" twice.
  const hadAnyVerified = !!(user.emailVerified || user.phoneVerified);
  const grantedAccess = !hadAnyVerified;

  await prisma.user.update({ where: { id: userId }, data });

  if (grantedAccess) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, status: 'ACTIVE', isActive: true },
    });
  }

  const refreshed = await prisma.user.findUnique({ where: { id: userId } });

  return {
    channel,
    channelVerified: true,
    // Whether this verification unlocked the account (vs. merely adding a route).
    grantedAccess,
    verifiedChannels: channelsFor(refreshed).filter((c) => c.verified).map((c) => c.channel),
    user: refreshed,
  };
};
