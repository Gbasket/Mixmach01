/*
  Warnings:

  - Added the required column `collectionId` to the `DiscountRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collectionTitle` to the `DiscountRule` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiscountRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "collectionId" TEXT NOT NULL,
    "collectionTitle" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DiscountRule" ("createdAt", "id", "isActive", "price", "quantity", "updatedAt") SELECT "createdAt", "id", "isActive", "price", "quantity", "updatedAt" FROM "DiscountRule";
DROP TABLE "DiscountRule";
ALTER TABLE "new_DiscountRule" RENAME TO "DiscountRule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
