-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "qualification" TEXT,
    "specialty" TEXT,
    "plan" TEXT,
    "subscriptionStatus" TEXT,
    "notes" TEXT,
    "sheetSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LeadEvent_createdAt_idx" ON "LeadEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LeadEvent_email_idx" ON "LeadEvent"("email");
