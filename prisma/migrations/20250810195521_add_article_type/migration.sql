-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('DEEP_DIVE', 'OVERVIEW');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "type" "ArticleType" NOT NULL DEFAULT 'DEEP_DIVE';
