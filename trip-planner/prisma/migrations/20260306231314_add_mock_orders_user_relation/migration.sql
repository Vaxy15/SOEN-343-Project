/*
  Warnings:

  - Added the required column `userId` to the `MockOrder` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MockOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL,
    CONSTRAINT "MockOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MockOrder" ("createdAt", "detailsJson", "id", "priceCents", "status", "type") SELECT "createdAt", "detailsJson", "id", "priceCents", "status", "type" FROM "MockOrder";
DROP TABLE "MockOrder";
ALTER TABLE "new_MockOrder" RENAME TO "MockOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
