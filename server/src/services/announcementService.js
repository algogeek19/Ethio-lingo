import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';

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

export const createAnnouncement = async ({ createdBy, createdByName, title, content, audienceLevel = 'ALL' }) => {
  const cleanTitle = (title || '').toString().trim();
  const cleanContent = (content || '').toString().trim();

  if (!cleanTitle || !cleanContent) {
    throw new AppError('Announcement title and content are both required.', 400);
  }
  if (!ALLOWED_AUDIENCES.includes(audienceLevel)) {
    throw new AppError(`Invalid audience level. Allowed: ${ALLOWED_AUDIENCES.join(', ')}`, 400);
  }

  return await prisma.announcement.create({
    data: {
      title: cleanTitle,
      content: cleanContent,
      audienceLevel,
      isActive: true,
      createdBy,
      createdByName,
    },
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
  await prisma.announcement.delete({ where: { id: announcementId } });
  return { id: announcementId, deleted: true };
};