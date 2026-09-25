import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as smsService from './smsService.js';
import logger from '../utils/logger.js';

const ALLOWED_AUDIENCES = ['ALL', 'Free Trial', 'Beginner I', 'Beginner II', 'Intermediate I', 'Intermediate II', 'Advanced I', 'Advanced II'];

export const getPublishedAnnouncements = async (userLevel, isFreeTrial) => {
  const where = { isActive: true };
  const level = isFreeTrial ? 'Free Trial' : (userLevel || 'ALL');

  return await prisma.announcement.findMany({
    where: {
      ...where,
      OR: [{ audienceLevel: 'ALL' }, { audienceLevel: level }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

/**
 * All ACTIVE learners with a phone number whose level (or free-trial flag)
 * matches the announcement audience. `ALL` matches every learner.
 */
const collectRecipients = async (audienceLevel) => {
  const users = await prisma.user.findMany({
    where: { isActive: true, status: 'ACTIVE', phone: { not: null } },
    select: { id: true, phone: true, level: true, wallet: { select: { isFreeTrial: true } } },
  });

  return users.filter((u) => {
    if (audienceLevel === 'ALL') return true;
    if (audienceLevel === 'Free Trial') return !!u.wallet?.isFreeTrial;
    return u.level === audienceLevel;
  });
};

export const countAnnouncementAudience = async (audienceLevel = 'ALL') => {
  if (!ALLOWED_AUDIENCES.includes(audienceLevel)) {
    throw new AppError(`Invalid audience level. Allowed: ${ALLOWED_AUDIENCES.join(', ')}`, 400);
  }
  const recipients = await collectRecipients(audienceLevel);
  return { audienceLevel, recipientCount: recipients.length };
};

export const createAnnouncement = async ({ createdBy, createdByName, title, content, audienceLevel = 'ALL' }) => {
  const cleanTitle = (title || '').toString().trim();
  const cleanContent = (content || '').toString().trim();

  if (!cleanTitle || !cleanContent) {
    throw new AppError('Announcement title and content are both required.', 400);
  }
  if (!ALLOWED_AUDIENCES.includes(audienceLevel)) {
    throw new AppError(`Invalid audience level. Allowed: ${ALLOWED_AUDIENCES.join(', ')}`, 400);
  }

  // Persist the announcement as the audit record — delivery happens over SMS.
  const announcement = await prisma.announcement.create({
    data: {
      title: cleanTitle,
      content: cleanContent,
      audienceLevel,
      isActive: true,
      createdBy,
      createdByName,
    },
  });

  const recipients = await collectRecipients(audienceLevel);
  const smsConfigured = smsService.isSmsConfigured();
  const smsMessage = `${cleanTitle}\n${cleanContent}`.slice(0, smsService.MAX_SMS_CHARS);

  if (!smsConfigured || recipients.length === 0) {
    logger.warn(
      `Announcement ${announcement.id}: SMS skipped (configured=${smsConfigured}, recipients=${recipients.length})`,
    );
    return {
      ...announcement,
      sms: {
        configured: smsConfigured,
        recipients: recipients.length,
        sent: 0,
        failed: 0,
        note: !smsConfigured
          ? 'GeezSMS token not configured — announcement recorded, no SMS sent.'
          : 'No recipients with a phone number matched this audience.',
      },
    };
  }

  const delivery = await smsService.sendBulkSms({
    phones: recipients.map((r) => r.phone),
    msg: smsMessage,
    senderId: ENV.GEEZSMS_SENDER_ID || undefined,
  });

  await prisma.smsLog.createMany({
    data: delivery.results.map((r) => ({
      announcementId: announcement.id,
      phone: r.phone,
      message: smsMessage,
      status: r.success ? 'SENT' : 'FAILED',
      providerMessage: r.providerMessage || null,
      error: r.error || null,
    })),
  });

  logger.info(
    `Announcement ${announcement.id}: SMS broadcast ${delivery.sent} sent / ${delivery.failed} failed of ${delivery.total}`,
  );

  return {
    ...announcement,
    sms: {
      configured: true,
      recipients: delivery.total,
      sent: delivery.sent,
      failed: delivery.failed,
      note: `SMS broadcast complete — ${delivery.sent} sent, ${delivery.failed} failed of ${delivery.total} recipients.`,
    },
  };
};

export const listSmsLogs = async ({ limit = 100, announcementId } = {}) => {
  return await prisma.smsLog.findMany({
    where: announcementId ? { announcementId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(Number(limit) || 100, 1), 500),
  });
};

export const listAllAnnouncements = async (includeInactive = true) => {
  const where = includeInactive ? {} : { isActive: true };
  return await prisma.announcement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const updateAnnouncement = async (announcementId, updateData) => {
  const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!existing) {
    throw new AppError('Announcement not found.', 404);
  }

  const data = {};
  if (updateData.title !== undefined) {
    const t = (updateData.title || '').toString().trim();
    if (!t) throw new AppError('Announcement title cannot be empty.', 400);
    data.title = t;
  }
  if (updateData.content !== undefined) {
    const c = (updateData.content || '').toString().trim();
    if (!c) throw new AppError('Announcement content cannot be empty.', 400);
    data.content = c;
  }
  if (updateData.audienceLevel !== undefined) {
    if (!ALLOWED_AUDIENCES.includes(updateData.audienceLevel)) {
      throw new AppError(`Invalid audience level. Allowed: ${ALLOWED_AUDIENCES.join(', ')}`, 400);
    }
    data.audienceLevel = updateData.audienceLevel;
  }
  if (updateData.isActive !== undefined) data.isActive = Boolean(updateData.isActive);

  return await prisma.announcement.update({
    where: { id: announcementId },
    data,
  });
};

export const deleteAnnouncement = async (announcementId) => {
  const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!existing) {
    throw new AppError('Announcement not found.', 404);
  }
  await prisma.smsLog.deleteMany({ where: { announcementId } });
  await prisma.announcement.delete({ where: { id: announcementId } });
  return { id: announcementId, deleted: true };
};