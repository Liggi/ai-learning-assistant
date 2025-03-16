/*
  Warnings:

  - You are about to drop the column `metadata` on the `Article` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Article" DROP COLUMN "metadata",
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "takeaways" TEXT[] DEFAULT ARRAY[]::TEXT[];
