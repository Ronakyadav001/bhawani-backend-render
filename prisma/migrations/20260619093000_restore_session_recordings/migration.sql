CREATE TABLE IF NOT EXISTS "SessionRecording" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "recordingUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionRecording_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionRecording_sessionId_idx" ON "SessionRecording"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionRecording_isActive_createdAt_idx" ON "SessionRecording"("isActive", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SessionRecording_sessionId_fkey'
  ) THEN
    ALTER TABLE "SessionRecording"
      ADD CONSTRAINT "SessionRecording_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
