import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { safeDbQuery } from '../utils/dbHelper.js';

export const CHAT_ROOMS = [
  'Daily Topic',
  'Free Trial',
  'Beginner I',
  'Beginner II',
  'Intermediate I',
  'Intermediate II',
  'Advanced I',
  'Advanced II',
];

export const DAILY_TOPICS = [
  'Daily Greetings & Introductions',
  'Ordering Food at a Restaurant',
  'Weather and Seasons',
  'Shopping & Bargaining',
  'Daily Routines and Habits',
  'Travel & Transportation',
  'Health and Fitness',
  'Jobs, Careers & Interviews',
  'Ethiopian Festivals & Holidays',
  'Education & Online Learning',
  'Business Small Talk',
  'Technology & Social Media',
  'Family and Relationships',
  'Cities: Addis Ababa & Beyond',
  'Sports and Hobbies',
  'Money, Saving & Banking',
  'Environment & Recycling',
  'Music and Entertainment',
  'Food Culture: Injera, Coffee & More',
  'Planning a Weekend Trip',
  'Storytelling & Past Events',
  'Making Plans for the Future',
  'Giving Advice & Opinions',
  'Expressing Likes and Dislikes',
  'At the Market: Coffee & Spices',
  'Learning English Tips',
  'Health Checkup at a Clinic',
  'Phones, Apps & Digital Life',
  'Community and Volunteering',
  'A Day at a Coffee Ceremony',
];

const getDayIndex = () => {
  const today = new Date();
  const start = Date.UTC(today.getUTCFullYear(), 0, 0);
  const diff = today - start;
  const day = Math.floor(diff / 86400000);
  return day;
};

export const getDailyTopic = () => {
  return {
    name: DAILY_TOPICS[getDayIndex() % DAILY_TOPICS.length],
    date: new Date().toISOString().split('T')[0],
  };
};

export const getRoomsForUser = async (userId) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  const userLevel = dbUser ? dbUser.level : 'Beginner I';
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const isFreeTrial = wallet ? !!wallet.isFreeTrial : false;

  const dailyTopic = getDailyTopic();

  const rooms = CHAT_ROOMS.map((room) => {
    let joined = false;
    if (room === 'Daily Topic') joined = true;
    else if (room === 'Free Trial') joined = !!isFreeTrial;
    else joined = room === userLevel;
    return { name: room, joined };
  });

  const countRows = await safeDbQuery(
    () => prisma.chatMessage.groupBy({ by: ['roomLevel'], _count: { _all: true } }),
    () => []
  );
  const counts = {};
  for (const c of countRows || []) {
    counts[c.roomLevel] = c._count._all;
  }

  return { rooms, counts, dailyTopic, userLevel, isFreeTrial };
};

const parseReactions = (raw) => {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const serializeMessage = (m) => ({
  id: m.id,
  roomLevel: m.roomLevel,
  content: m.content,
  replyToId: m.replyToId || null,
  replyToContent: m.replyToContent || null,
  replyToAuthorName: m.replyToAuthorName || null,
  edited: !!m.edited,
  editedAt: m.editedAt || null,
  reactions: parseReactions(m.reactions),
  createdAt: m.createdAt,
  user: m.user
    ? { id: m.user.id, name: m.user.name, level: m.user.level }
    : { id: m.userId, name: 'Unknown', level: '' },
});

export const getChatMessages = async (userId, roomLevel, afterId = null) => {
  const room = (roomLevel || '').trim();
  if (!CHAT_ROOMS.includes(room)) {
    throw new AppError(`Invalid chat room. Allowed rooms: ${CHAT_ROOMS.join(', ')}`, 400);
  }

  const limit = 100;
  const where = { roomLevel: room };
  if (afterId) {
    where.and = [
      { roomLevel: room },
      { id: { gt: afterId } },
    ];
    delete where.roomLevel;
  }

  const messages = await safeDbQuery(
    () =>
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: {
          user: { select: { id: true, name: true, level: true, isBanned: true } },
        },
      }),
    () => []
  );

  // Banned users' public chat content is concealed from everyone
  return (messages || [])
    .filter((m) => m.user && !m.user.isBanned)
    .map((m) => serializeMessage(m));
};

export const ensureRoomAccess = async (userId, room) => {
  if (!CHAT_ROOMS.includes(room)) {
    throw new AppError(`Invalid chat room. Allowed rooms: ${CHAT_ROOMS.join(', ')}`, 400);
  }
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    throw new AppError('Authenticated user not found', 404);
  }
  if (dbUser.role === 'admin') return dbUser;
  if (room === 'Daily Topic') return dbUser;
  if (room === 'Free Trial') {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || !wallet.isFreeTrial) {
      throw new AppError('Forbidden: Free Trial room is only for learners on the free trial track.', 403);
    }
    return dbUser;
  }
  if (room !== dbUser.level) {
    throw new AppError(`Forbidden: You can only access your level room (${dbUser.level}) or the Daily Topic room.`, 403);
  }
  return dbUser;
};

export const postChatMessage = async (userId, roomLevel, content, replyToId = null) => {
  const room = (roomLevel || '').trim();
  if (!CHAT_ROOMS.includes(room)) {
    throw new AppError(`Invalid chat room. Allowed rooms: ${CHAT_ROOMS.join(', ')}`, 400);
  }

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    throw new AppError('Authenticated user not found', 404);
  }
  if (dbUser.isBanned) {
    throw new AppError('Forbidden: Your account is banned from the community chat.', 403);
  }

  const cleaned = (content || '').toString().trim();
  if (!cleaned) {
    throw new AppError('Chat message cannot be empty.', 400);
  }
  if (cleaned.length > 1000) {
    throw new AppError('Chat message is too long (maximum 1000 characters).', 400);
  }

  await ensureRoomAccess(userId, room);

  let replyToContent = null;
  let replyToAuthorName = null;
  if (replyToId) {
    const target = await prisma.chatMessage.findUnique({
      where: { id: replyToId },
      include: { user: { select: { name: true } } },
    });
    if (!target) {
      throw new AppError('The message you are replying to no longer exists.', 404);
    }
    if (target.roomLevel !== room) {
      throw new AppError('You can only reply to messages in the same room.', 400);
    }
    replyToContent = target.content;
    replyToAuthorName = target.user ? target.user.name : 'Unknown';
  }

  const message = await safeDbQuery(
    () =>
      prisma.chatMessage.create({
        data: {
          roomLevel: room,
          userId,
          content: cleaned,
          replyToId: replyToId || null,
          replyToContent,
          replyToAuthorName,
        },
        include: { user: { select: { id: true, name: true, level: true, isBanned: true } } },
      }),
    () => ({
      id: `msg-${Math.floor(1000 + Math.random() * 9000)}`,
      roomLevel: room,
      userId,
      content: cleaned,
      replyToId: replyToId || null,
      replyToContent,
      replyToAuthorName,
      createdAt: new Date(),
      user: { id: userId, name: dbUser.name, level: dbUser.level, isBanned: dbUser.isBanned },
    })
  );

  return serializeMessage(message);
};

export const editChatMessage = async (userId, messageId, content) => {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    throw new AppError('Chat message not found.', 404);
  }
  if (message.userId !== userId) {
    throw new AppError('Forbidden: You can only edit your own messages.', 403);
  }
  const cleaned = (content || '').toString().trim();
  if (!cleaned) {
    throw new AppError('Chat message cannot be empty.', 400);
  }
  if (cleaned.length > 1000) {
    throw new AppError('Chat message is too long (maximum 1000 characters).', 400);
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { content: cleaned, edited: true, editedAt: new Date() },
    include: { user: { select: { id: true, name: true, level: true, isBanned: true } } },
  });

  return serializeMessage(updated);
};

export const deleteChatMessage = async (userId, messageId) => {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    throw new AppError('Chat message not found.', 404);
  }
  if (message.userId !== userId) {
    throw new AppError('Forbidden: You can only delete your own messages.', 403);
  }

  await prisma.chatMessage.delete({ where: { id: messageId } });
  return { id: messageId, deleted: true };
};

export const toggleMessageReaction = async (userId, messageId, emoji) => {
  const cleanEmoji = (emoji || '').toString().trim();
  if (!cleanEmoji || [...cleanEmoji].length > 8) {
    throw new AppError('Invalid reaction emoji.', 400);
  }

  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    throw new AppError('Chat message not found.', 404);
  }

  const reactions = parseReactions(message.reactions);
  const existing = reactions.find((r) => r.emoji === cleanEmoji);
  if (existing) {
    const idx = existing.userIds.indexOf(userId);
    if (idx >= 0) {
      existing.userIds.splice(idx, 1);
      if (existing.userIds.length === 0) {
        reactions.splice(reactions.indexOf(existing), 1);
      }
    } else {
      existing.userIds.push(userId);
    }
  } else {
    reactions.push({ emoji: cleanEmoji, userIds: [userId] });
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(reactions) },
    include: { user: { select: { id: true, name: true, level: true, isBanned: true } } },
  });

  return serializeMessage(updated);
};

export const getRoomMembers = async (userId, roomLevel) => {
  const room = (roomLevel || '').trim();
  await ensureRoomAccess(userId, room);

  const rows = await prisma.chatMessage.findMany({
    where: { roomLevel: room },
    distinct: ['userId'],
    select: { userId: true },
    take: 50,
  });
  const ids = rows.map((r) => r.userId);
  if (ids.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, isBanned: false },
    select: { id: true, name: true, level: true },
  });
  return users.map((u) => ({ id: u.id, name: u.name, level: u.level }));
};

const typingStore = new Map();
const TYPING_WINDOW_MS = 8000;

export const setRoomTyping = async (userId, roomLevel) => {
  const room = (roomLevel || '').trim();
  const dbUser = await ensureRoomAccess(userId, room);
  const roomMap = typingStore.get(room) || new Map();
  roomMap.set(userId, { name: dbUser.name, ts: Date.now() });
  typingStore.set(room, roomMap);
  return { room, typing: true };
};

export const getRoomTyping = async (userId, roomLevel) => {
  const room = (roomLevel || '').trim();
  await ensureRoomAccess(userId, room);
  const roomMap = typingStore.get(room) || new Map();
  const now = Date.now();
  const typers = [];
  for (const [uid, info] of roomMap) {
    if (uid === userId) continue;
    if (now - info.ts > TYPING_WINDOW_MS) {
      roomMap.delete(uid);
      continue;
    }
    typers.push({ userId: uid, name: info.name });
  }
  if (roomMap.size === 0) typingStore.delete(room);
  return typers.slice(0, 3);
};

export const reportChatMessage = async (reporterUserId, messageId, reason) => {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { user: { select: { id: true, name: true, level: true } } },
  });

  if (!message) {
    throw new AppError('Chat message not found or already deleted.', 404);
  }
  if (message.userId === reporterUserId) {
    throw new AppError('You cannot report your own chat message.', 400);
  }

  const cleanReason = (reason || '').toString().trim();
  if (!cleanReason) {
    throw new AppError('Please provide a reason for reporting this message.', 400);
  }

  const existingOpen = await prisma.chatReport.findFirst({
    where: { messageId, reporterUserId, status: 'open' },
  });
  if (existingOpen) {
    return { report: existingOpen, duplicate: true };
  }

  const report = await prisma.chatReport.create({
    data: {
      messageId: message.id,
      messageContent: message.content,
      roomLevel: message.roomLevel || '',
      reportedUserId: message.userId,
      reporterUserId,
      reason: cleanReason,
      status: 'open',
    },
  });

  return { report, duplicate: false };
};

export const listChatReports = async (status = null) => {
  const where = {};
  if (status) where.status = status;

  return await prisma.chatReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      reporterUser: { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true, level: true, isBanned: true } },
    },
  });
};

export const updateChatReportStatus = async (reportId, status, { banReportedUser = false } = {}) => {
  const allowed = ['open', 'resolved', 'dismissed'];
  if (!allowed.includes(status)) {
    throw new AppError(`Invalid report status. Allowed: ${allowed.join(', ')}`, 400);
  }

  const existingReport = await prisma.chatReport.findUnique({ where: { id: reportId } });
  if (!existingReport) {
    throw new AppError('Chat report not found.', 404);
  }

  const report = await prisma.chatReport.update({
    where: { id: reportId },
    data: { status },
  });

  if (status === 'resolved' && banReportedUser && existingReport.reportedUserId) {
    await prisma.user.update({
      where: { id: existingReport.reportedUserId },
      data: { isBanned: true, isActive: false },
    });
  }

  return report;
};

// ============================================================
// Messenger (Direct Chat) — learners chat 1-on-1 within a level
// ============================================================

// Normalize a user pair so the smaller id is always stored in userAId
const normalizePair = (idA, idB) =>
  idA < idB ? { userAId: idA, userBId: idB } : { userAId: idB, userBId: idA };

export const getOrCreateDirectChat = async (userAId, userBId) => {
  if (userAId === userBId) {
    throw new AppError('You cannot start a conversation with yourself.', 400);
  }
  const pair = normalizePair(userAId, userBId);

  const existing = await prisma.directChat.findUnique({
    where: { userAId_userBId: pair },
  });
  if (existing) return existing;

  return prisma.directChat.create({ data: pair });
};

export const findDirectChatBetween = async (userId, peerId) => {
  const pair = normalizePair(userId, peerId);
  return prisma.directChat.findUnique({
    where: { userAId_userBId: pair },
  });
};

// List every same-level learner the current user can message, with a live preview
export const getDirectChatPeers = async (userId) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    throw new AppError('Authenticated user not found', 404);
  }
  const level = dbUser.role === 'admin' ? 'Beginner I' : dbUser.level;

  const peers = await prisma.user.findMany({
    where: {
      role: 'learner',
      level,
      isBanned: false,
      isActive: true,
      id: { not: userId },
    },
    select: { id: true, name: true, email: true, level: true, image: true, isOnboarded: true },
    orderBy: { name: 'asc' },
    take: 200,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const dailyTopic = getDailyTopic();

  const peersWithPreview = await Promise.all(
    (peers || []).map(async (peer) => {
      let lastMessage = null;
      try {
        const chat = await findDirectChatBetween(userId, peer.id);
        if (chat) {
          const last = await prisma.chatMessage.findFirst({
            where: { directChatId: chat.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true, content: true, createdAt: true, userId: true },
          });
          if (last) {
            lastMessage = {
              id: last.id,
              content: last.content,
              createdAt: last.createdAt,
              fromMe: last.userId === userId,
            };
          }
        }
      } catch (err) {
        console.warn('Direct chat preview error:', err.message || err);
      }

      return {
        id: peer.id,
        name: peer.name,
        email: peer.email,
        level: peer.level,
        image: peer.image || null,
        isOnboarded: !!peer.isOnboarded,
        lastMessage,
        topic: dailyTopic.name,
        topicDate: todayStr,
      };
    })
  );

  return { peers: peersWithPreview, dailyTopic, level, todayStr };
};

export const getDirectMessages = async (userId, peerId) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    throw new AppError('Authenticated user not found', 404);
  }
  const peer = await prisma.user.findUnique({ where: { id: peerId } });
  if (!peer || peer.role !== 'learner' || peer.isBanned) {
    throw new AppError('This learner is not available for direct messaging.', 404);
  }

  const chat = await findDirectChatBetween(userId, peerId);
  if (!chat) {
    return { chatId: null, peer: { id: peer.id, name: peer.name, level: peer.level, image: peer.image }, messages: [] };
  }

  const messages = await prisma.chatMessage.findMany({
    where: { directChatId: chat.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
    include: { user: { select: { id: true, name: true, level: true, isBanned: true } } },
  });

  return {
    chatId: chat.id,
    peer: { id: peer.id, name: peer.name, level: peer.level, image: peer.image },
    messages: (messages || []).map((m) => serializeMessage(m)),
  };
};

export const postDirectMessage = async (userId, peerId, content) => {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    throw new AppError('Authenticated user not found', 404);
  }
  if (dbUser.isBanned) {
    throw new AppError('Forbidden: Your account is banned from messaging.', 403);
  }

  const peer = await prisma.user.findUnique({ where: { id: peerId } });
  if (!peer || peer.role !== 'learner' || peer.isBanned) {
    throw new AppError('This learner is not available for direct messaging.', 404);
  }

  const cleaned = (content || '').toString().trim();
  if (!cleaned) {
    throw new AppError('Chat message cannot be empty.', 400);
  }
  if (cleaned.length > 1000) {
    throw new AppError('Chat message is too long (maximum 1000 characters).', 400);
  }

  const chat = await getOrCreateDirectChat(userId, peer.id);

  const message = await prisma.chatMessage.create({
    data: {
      roomLevel: 'Direct',
      directChatId: chat.id,
      userId,
      content: cleaned,
    },
    include: { user: { select: { id: true, name: true, level: true, isBanned: true } } },
  });

  return serializeMessage(message);
};