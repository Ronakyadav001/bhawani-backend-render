-- AlterTable
ALTER TABLE "LiveSession" ADD COLUMN     "liveNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "missedProcessedAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OnboardingCall" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DietComplianceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followed" BOOLEAN NOT NULL,
    "mealsFollowed" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietComplianceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "energyLevel" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DietComplianceEntry_userId_date_idx" ON "DietComplianceEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DietComplianceEntry_userId_dietPlanId_date_key" ON "DietComplianceEntry"("userId", "dietPlanId", "date");

-- CreateIndex
CREATE INDEX "ProgressEntry_userId_date_idx" ON "ProgressEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "DietComplianceEntry" ADD CONSTRAINT "DietComplianceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietComplianceEntry" ADD CONSTRAINT "DietComplianceEntry_dietPlanId_fkey" FOREIGN KEY ("dietPlanId") REFERENCES "DietPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressEntry" ADD CONSTRAINT "ProgressEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
