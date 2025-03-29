-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "learningMapId" TEXT NOT NULL,
    "parentArticleId" TEXT NOT NULL,
    "childArticleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_childArticleId_key" ON "Question"("childArticleId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_learningMapId_fkey" FOREIGN KEY ("learningMapId") REFERENCES "LearningMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_parentArticleId_fkey" FOREIGN KEY ("parentArticleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_childArticleId_fkey" FOREIGN KEY ("childArticleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
