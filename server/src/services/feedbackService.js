import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';

const ALLOWED_CATEGORIES = ['BUG', 'FEATURE', 'CONTENT', 'OTHER'];
const ALLOWED_STATUSES = ['open', 'read', 'closed'];

export const submitFeedback = async ({ userId, name, category, message, rating = null }) => {
  const cleanCategory = (category || '').toString().trim();
  const cleanMessage = (message || '').toString().trim();

  if (!ALLOWED_CATEGORIES.includes(cleanCategory)) {
    throw new AppError(`Invalid feedback category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`, 400);
  }
  if (!cleanMessage) {
    throw new AppError('Feedback message cannot be empty.', 400);
  }
  if (cleanMessage.length > 2000) {
    throw new AppError('Feedback message is too long (maximum 2000 characters).', 400);
  }

  const parsedRating = rating === null || rating === undefined || rating === '' ? null : parseInt(rating, 10);
  if (parsedRating !== null && (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
    throw new AppError('Feedback rating must be an integer between 1 and 5.', 400);
  }

  return await prisma.feedback.create({
    data: {
      userId,
      createdByName: (name || 'Learner').slice(0, 100),
      category: cleanCategory,
      message: cleanMessage,
      rating: parsedRating,
      status: 'open',
    },
  });
};

export const listFeedback = async (status = null) => {
  const where = {};
  if (status && ALLOWED_STATUSES.includes(status)) where.status = status;
  return await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, level: true } },
    },
  });
};

export const updateFeedbackStatus = async (feedbackId, status) => {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new AppError(`Invalid feedback status. Allowed: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }
  const existing = await prisma.feedback.findUnique({ where: { id: feedbackId } });
  if (!existing) {
    throw new AppError('Feedback entry not found.', 404);
  }
  return await prisma.feedback.update({
    where: { id: feedbackId },
    data: { status },
  });
};