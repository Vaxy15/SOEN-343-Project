-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BIKE',
    "provider" TEXT,
    "stationId" TEXT,
    "stationName" TEXT,
    "available" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BikeStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "available" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BikeStock" ("available", "id", "updatedAt") SELECT "available", "id", "updatedAt" FROM "BikeStock";
DROP TABLE "BikeStock";
ALTER TABLE "new_BikeStock" RENAME TO "BikeStock";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
