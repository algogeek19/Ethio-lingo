-- Ethio-Lingo incremental schema patch
-- Adds only what the current code needs. Creates nothing that exists;
-- drops nothing. Safe to run against the live database.

-- 1) New columns on the existing "user" table (incl. phone, used by SMS announcements)
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "age" INTEGER,
  ADD COLUMN IF NOT EXISTS "interests" TEXT,
  ADD COLUMN IF NOT EXISTS "listeningMinutesPerDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "listeningCategories" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false;

-- 2) New tables
CREATE TABLE IF NOT EXISTS "exam_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "progressDate" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "passThreshold" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answersJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "direct_chat" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_chat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chat_message" (
    "id" TEXT NOT NULL,
    "roomLevel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "directChatId" TEXT,
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "replyToContent" TEXT,
    "replyToAuthorName" TEXT,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "reactions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "chat_report" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageContent" TEXT NOT NULL,
    "roomLevel" TEXT NOT NULL DEFAULT '',
    "reportedUserId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audienceLevel" TEXT NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByName" TEXT NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sms_log" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerMessage" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "file" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- 3) Foreign keys and indexes for the new tables
CREATE INDEX "exam_attempt_userId_createdAt_idx" ON "exam_attempt"("userId", "createdAt");
CREATE INDEX "direct_chat_userBId_idx" ON "direct_chat"("userBId");
CREATE UNIQUE INDEX "direct_chat_userAId_userBId_key" ON "direct_chat"("userAId", "userBId");
CREATE INDEX "chat_message_roomLevel_createdAt_idx" ON "chat_message"("roomLevel", "createdAt");
CREATE INDEX "chat_message_directChatId_createdAt_idx" ON "chat_message"("directChatId", "createdAt");
CREATE INDEX "chat_report_status_createdAt_idx" ON "chat_report"("status", "createdAt");
CREATE INDEX "sms_log_announcementId_idx" ON "sms_log"("announcementId");
CREATE INDEX "sms_log_createdAt_idx" ON "sms_log"("createdAt");
ALTER TABLE "exam_attempt" ADD CONSTRAINT "exam_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_chat" ADD CONSTRAINT "direct_chat_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_chat" ADD CONSTRAINT "direct_chat_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_directChatId_fkey" FOREIGN KEY ("directChatId") REFERENCES "direct_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_report" ADD CONSTRAINT "chat_report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_report" ADD CONSTRAINT "chat_report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- done