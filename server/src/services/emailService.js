import { ENV } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

/**
 * Outbound transactional email via Mailtrap's HTTP API.
 *
 * Uses fetch rather than nodemailer so the project gains no new dependency.
 * Mailtrap's API is identical in staging and production, which means the whole
 * verification workflow can be exercised end to end against a staging inbox
 * before a real sender domain exists.
 *
 * Every sender is resolved from configuration; the API token is intentionally
 * left unset in this repo and must be supplied at deploy time.
 */

export const isEmailConfigured = () =>
  Boolean(ENV.MAILTRAP_TOKEN && ENV.MAILTRAP_FROM_EMAIL);

/** Mailtrap's sending endpoint. Overridable for regional/EU accounts. */
const sendEndpoint = () => {
  const base = ENV.MAILTRAP_HOST || 'https://send.api.mailtrap.io';
  return `${base.replace(/\/+$/, '')}/api/send`;
};

/**
 * Send one transactional email.
 *
 * Resolves (never throws for provider/network faults) so callers can record
 * per-recipient delivery status rather than failing a whole broadcast. Only a
 * genuinely invalid request (no recipient) throws, because retrying cannot help.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const recipient = String(to || '').trim();
  if (!recipient) {
    throw new AppError('An email recipient is required.', 400);
  }
  if (!isEmailConfigured()) {
    throw new AppError('Email is not configured (missing MAILTRAP_TOKEN or MAILTRAP_FROM_EMAIL).', 503);
  }

  try {
    const response = await fetch(sendEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.MAILTRAP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_email: ENV.MAILTRAP_FROM_EMAIL,
        from_name: ENV.MAILTRAP_FROM_NAME || 'Ethio-Lingo',
        to: [{ email: recipient }],
        subject,
        text,
        html,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error || data?.message || `Mailtrap error (HTTP ${response.status})`;
      logger.error(`Mailtrap send failed for ${recipient}: ${message}`);
      return { to: recipient, success: false, error: message, raw: data };
    }
    return { to: recipient, success: true, providerMessageId: data?.message?.id || null, raw: data };
  } catch (err) {
    logger.error(`Mailtrap request error for ${recipient}: ${err.message}`);
    return { to: recipient, success: false, error: err.message || 'Network error contacting Mailtrap' };
  }
};

/**
 * Build the verification email for a channel-confirmation code.
 *
 * `expiresMinutes` is surfaced in the copy so the learner knows how long they
 * have, and the code is the only thing they need to act on.
 */
export const buildVerificationEmail = ({ name, code, expiresMinutes = 15 }) => {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const subject = `${code} is your Ethio-Lingo verification code`;
  const text = [
    greeting,
    '',
    `Your Ethio-Lingo verification code is: ${code}`,
    '',
    `It expires in ${expiresMinutes} minutes. Enter it on the verification page to finish setting up your account.`,
    '',
    'If you did not create an Ethio-Lingo account you can ignore this message.',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f3ef;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#2b2622;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e6ded4;">
    <p style="margin:0 0 20px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8a7f72;">Ethio-Lingo</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;">Confirm your email</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5c534a;">${greeting}</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#5c534a;">Use this code to finish setting up your account:</p>
    <div style="margin:0 0 24px;padding:20px;background:#f6f3ef;border:1px solid #e6ded4;border-radius:12px;text-align:center;">
      <span style="font-size:32px;font-weight:700;letter-spacing:.28em;color:#2b2622;">${code}</span>
    </div>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#8a7f72;">This code expires in ${expiresMinutes} minutes. If you did not create an Ethio-Lingo account, you can ignore this email.</p>
  </div>
</body></html>`;

  return { subject, text, html };
};

/** Deliver a verification code to an email address. */
export const sendVerificationEmail = async ({ to, name, code, expiresMinutes }) => {
  const message = buildVerificationEmail({ name, code, expiresMinutes });
  return await sendEmail({ to, ...message });
};

/** Send one message to many recipients with a bounded concurrency pool. */
export const sendBulkEmail = async ({ recipients, subject, text, html, concurrency = 5 }) => {
  const results = [];
  let index = 0;

  const worker = async () => {
    while (index < recipients.length) {
      const to = recipients[index++];
      results.push(await sendEmail({ to, subject, text, html }));
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(recipients.length, 1)) }, worker),
  );

  return {
    total: recipients.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
};
