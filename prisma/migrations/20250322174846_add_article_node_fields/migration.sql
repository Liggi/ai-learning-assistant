-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "positionX" DOUBLE PRECISION,
ADD COLUMN     "positionY" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "destinationArticleId" TEXT,
ADD COLUMN     "positionX" DOUBLE PRECISION,
ADD COLUMN     "positionY" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_destinationArticleId_fkey" FOREIGN KEY ("destinationArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
