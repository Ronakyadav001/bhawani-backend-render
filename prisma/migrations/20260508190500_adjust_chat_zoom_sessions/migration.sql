-- Remove the paused recordings feature from the active backend schema.
DROP TABLE IF EXISTS "SessionRecording";

-- Store Zoom meeting details directly on live sessions.
ALTER TABLE "LiveSession"
  ADD COLUMN IF NOT EXISTS "zoomMeetingId" TEXT,
  ADD COLUMN IF NOT EXISTS "zoomStartUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "zoomJoinUrl" TEXT;

-- Chat assistance is human/support chat, not AI chat.
ALTER TABLE "ChatMessage" DROP COLUMN IF EXISTS "aiResolved";

-- Remove paused enum variants from fresh deployments.
ALTER TYPE "SessionType" RENAME TO "SessionType_old";
CREATE TYPE "SessionType" AS ENUM ('LIVE');
ALTER TABLE "LiveSession" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "LiveSession" ALTER COLUMN "type" TYPE "SessionType" USING ("type"::text::"SessionType");
ALTER TABLE "LiveSession" ALTER COLUMN "type" SET DEFAULT 'LIVE';
DROP TYPE "SessionType_old";

ALTER TYPE "ChatSenderType" RENAME TO "ChatSenderType_old";
CREATE TYPE "ChatSenderType" AS ENUM ('USER', 'SUPPORT_ADMIN', 'DIETICIAN', 'YOGA_TRAINER');
ALTER TABLE "ChatMessage" ALTER COLUMN "senderType" TYPE "ChatSenderType" USING ("senderType"::text::"ChatSenderType");
DROP TYPE "ChatSenderType_old";
