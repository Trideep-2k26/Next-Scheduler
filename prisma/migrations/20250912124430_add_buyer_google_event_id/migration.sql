-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "buyerGoogleEventId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "duration" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "description" TEXT;
ALTER TABLE "User" ADD COLUMN "hourlyRate" INTEGER;
ALTER TABLE "User" ADD COLUMN "meetingDuration" INTEGER;
ALTER TABLE "User" ADD COLUMN "specialties" TEXT;
