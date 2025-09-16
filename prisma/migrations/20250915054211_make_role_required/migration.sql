/*
  Warnings:

  - Made the column `role` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL,
    "serviceType" TEXT,
    "refreshTokenEncrypted" TEXT,
    "description" TEXT,
    "specialties" TEXT,
    "hourlyRate" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "meetingDuration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "currency", "description", "email", "hourlyRate", "id", "image", "meetingDuration", "name", "refreshTokenEncrypted", "role", "serviceType", "specialties") SELECT "createdAt", "currency", "description", "email", "hourlyRate", "id", "image", "meetingDuration", "name", "refreshTokenEncrypted", "role", "serviceType", "specialties" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
