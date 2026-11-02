-- AlterTable
ALTER TABLE "Job" ADD COLUMN "employmentType" TEXT;
ALTER TABLE "Job" ADD COLUMN "locationRestrictions" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Job" ADD COLUMN "timezoneRestrictions" TEXT NOT NULL DEFAULT '[]';
