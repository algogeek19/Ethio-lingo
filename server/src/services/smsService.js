import { ENV } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

// GeezSMS caps a single message at ~335 characters (Unicode/Amharic safe).
// We budget 330 so the slash-separated title prefix never pushes us over.
export const MAX_SMS_CHARS = 330;

const CONCURRENCY = 8;

export const isSmsConfigured = () => Boolean(ENV.GEEZSMS_TOKEN && ENV.GEEZSMS_BASE_URL);

/**
 * Normalize an Ethiopian phone number to E.164-ish "251XXXXXXXXX".
 * Accepts "+251911234567", "0911234567", "251911234567", "911234567".
 * Returns null for anything that can't become a valid 251 + 9-digit number.
 */
export const normalizePhone = (raw) => {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('251')) digits = `251${digits}`;
  return /^251\d{9}$/.test(digits) ? digits : null;
};

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json', // GeezSMS returns JSON errors only with this header
  Authorization: `Bearer ${ENV.GEEZSMS_TOKEN}`,
});

/**
 * Send a single SMS via GeezSMS.
 * Endpoint verified live: POST {base}/sms/send with { phone, msg, sender_id }.
 * Returns a result object (never throws for provider/network errors) so callers
 * can record per-recipient delivery status without aborting the whole broadcast.
 */
export const sendSms = async ({ phone, msg, senderId }) => {
  const to = normalizePhone(phone);
  if (!to) return { phone: String(phone), success: false, error: `Invalid phone number: ${phone}` };
  if (!isSmsConfigured()) {
    throw new AppError('GeezSMS is not configured (missing GEEZSMS_TOKEN).', 503);
  }

  const body = { phone: to, msg: String(msg || '').slice(0, MAX_SMS_CHARS) };
  if (senderId) body.sender_id = senderId;

  try {
    const response = await fetch(`${ENV.GEEZSMS_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.message || data?.error || data?.detail || `GeezSMS error (HTTP ${response.status})`;
      return { phone: to, success: false, error: message, raw: data };
    }
    return { phone: to, success: true, providerMessage: data?.message || data?.status || 'sent', raw: data };
  } catch (err) {
    logger.error(`GeezSMS send failed for ${to}: ${err.message}`);
    return { phone: to, success: false, error: err.message || 'Network error contacting GeezSMS' };
  }
};

/** Send the same message to many phones with a bounded concurrency pool. */
export const sendBulkSms = async ({ phones, msg, senderId }) => {
  const queue = [...new Set(phones.map(normalizePhone).filter(Boolean))];
  const results = [];
  let index = 0;

  const worker = async () => {
    while (index < queue.length) {
      const phone = queue[index++];
      results.push(await sendSms({ phone, msg, senderId }));
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, Math.max(queue.length, 1)) }, worker),
  );

  return {
    total: queue.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
};

/** Check the remaining SMS balance on the GeezSMS account. */
export const getSmsBalance = async () => {
  if (!isSmsConfigured()) {
    throw new AppError('GeezSMS is not configured (missing GEEZSMS_TOKEN).', 503);
  }
  const response = await fetch(`${ENV.GEEZSMS_BASE_URL}/balance`, {
    headers: buildHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(data?.message || data?.error || `GeezSMS balance check failed (HTTP ${response.status})`, response.status);
  }
  return data;
};