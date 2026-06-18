ALTER TABLE "Lead"
ADD COLUMN "intent" TEXT,
ADD COLUMN "concern" TEXT,
ADD COLUMN "journey" TEXT,
ADD COLUMN "page" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "referrer" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "metadata" JSONB;

ALTER TABLE "Lead"
ALTER COLUMN "source" SET DEFAULT 'WEBSITE';

CREATE INDEX "Lead_source_status_idx" ON "Lead"("source", "status");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_concern_idx" ON "Lead"("concern");
