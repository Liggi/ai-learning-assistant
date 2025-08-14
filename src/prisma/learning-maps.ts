import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateSummary } from "@/features/generators/article-summary";
import { extractTakeaways } from "@/lib/article-takeaway-parser";
import { Logger } from "@/lib/logger";
import prisma from "@/prisma/client";
import type { SerializedLearningMap } from "@/types/serialized";
import { serializeLearningMap } from "@/types/serializers";

const logger = new Logger({ context: "LearningMapService", enabled: false });

const getOrCreateLearningMapSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
});

// Helper function to ensure an article has a summary
async function ensureArticleSummary(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || !article.content) {
    return;
  }

  if (!article.summary || article.summary.trim() === "") {
    logger.info("Generating missing summary for article", { articleId });
    try {
      await generateSummary({ data: { articleId } });
      logger.info("Successfully generated summary for article", { articleId });
    } catch (error) {
      logger.error("Failed to generate summary for article", { articleId, error });
    }
  }
}

// Helper function to ensure an article has takeaways
async function ensureArticleTakeaways(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article || !article.content) {
    return;
  }

  if (!article.takeaways || article.takeaways.length === 0) {
    logger.info("Generating missing takeaways for article", { articleId });
    try {
      const takeaways = extractTakeaways(article.content);
      if (takeaways.length > 0) {
        await prisma.article.update({
          where: { id: articleId },
          data: { takeaways },
        });
        logger.info("Successfully generated takeaways for article", {
          articleId,
          count: takeaways.length,
        });
      }
    } catch (error) {
      logger.error("Failed to generate takeaways for article", { articleId, error });
    }
  }
}

// Helper function to ensure all articles in a learning map have summaries and takeaways
async function ensureLearningMapContent(learningMapId: string) {
  const articles = await prisma.article.findMany({
    where: { learningMapId },
    select: { id: true },
  });

  // Process articles in parallel
  const promises = articles.map(async (article) => {
    await Promise.all([ensureArticleSummary(article.id), ensureArticleTakeaways(article.id)]);
  });

  await Promise.all(promises);
}

export const getOrCreateLearningMap = createServerFn({ method: "POST" })
  .validator((data: unknown) => getOrCreateLearningMapSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedLearningMap> => {
    const { subjectId } = data;

    logger.info("Handler: Getting or creating learning map", { subjectId });

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      logger.error("Subject not found", { subjectId });
      throw new Error(`Subject not found: ${subjectId}`);
    }

    const existingMap = await prisma.learningMap.findFirst({
      where: { subjectId },
      include: {
        articles: true,
        questions: true,
      },
    });

    if (existingMap) {
      logger.info("Found existing learning map", { id: existingMap.id });

      // Ensure all articles have summaries and takeaways
      await ensureLearningMapContent(existingMap.id);

      // Refetch the learning map with updated content
      const updatedMap = await prisma.learningMap.findUnique({
        where: { id: existingMap.id },
        include: {
          articles: true,
          questions: true,
        },
      });

      return serializeLearningMap(updatedMap!);
    }

    logger.info("Creating new learning map for subject", { subjectId });
    const newMap = await prisma.learningMap.create({
      data: {
        subjectId,
      },
      include: { articles: true, questions: true },
    });

    return serializeLearningMap(newMap);
  });
