-- CreateTable
CREATE TABLE "FailedEmail" (
    "id" TEXT NOT NULL,
    "taskType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastError" TEXT NOT NULL,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedEmail_resolvedAt_nextRetryAt_idx" ON "FailedEmail"("resolvedAt", "nextRetryAt");
