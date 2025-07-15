import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/react-start";
import { Logger } from "@/lib/logger";
import { ArticleMetadata } from "@/types/serialized";
import {
  serializeArticle,
  serializeLearningMap,
  serializeSubject,
} from "@/types/serializers";
import { fromPrismaJson } from "@/lib/prisma-utils";
import { generateSummary } from "@/features/generators/article-summary";
import { extractTakeaways } from "@/lib/article-takeaway-parser";

const logger = new Logger({ context: "ArticleService", enabled: false });

// Helper function to ensure all articles in a learning map have summaries and takeaways
async function ensureLearningMapContent(learningMapId: string) {
  const articles = await prisma.article.findMany({
    where: { learningMapId },
    select: { id: true },
  });
  
  // Process articles in parallel
  const promises = articles.map(async (article) => {
    await Promise.all([
      ensureArticleSummary(article.id),
      ensureArticleTakeaways(article.id),
    ]);
  });
  
  await Promise.all(promises);
}

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
        logger.info("Successfully generated takeaways for article", { articleId, count: takeaways.length });
      }
    } catch (error) {
      logger.error("Failed to generate takeaways for article", { articleId, error });
    }
  }
}

/**
 * Server function to create a new article in a learning map
 */
export const createArticle = createServerFn({ method: "POST" })
  .validator(
    (data: { learningMapId: string; content: string; isRoot?: boolean }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Creating article", {
      learningMapId: data.learningMapId,
    });
    try {
      // Check if the learning map exists
      const existingMap = await prisma.learningMap.findUnique({
        where: { id: data.learningMapId },
      });

      if (!existingMap) {
        throw new Error(`Learning map not found: ${data.learningMapId}`);
      }

      // Create the article
      const article = await prisma.article.create({
        data: {
          content: data.content,
          learningMapId: data.learningMapId,
          isRoot: data.isRoot ?? false,
        },
      });

      logger.info("Article created successfully", { id: article.id });
      return serializeArticle(article);
    } catch (error) {
      logger.error("Error creating article", { error });
      throw error;
    }
  });

/**
 * Server function to get an article by ID
 */
export const getArticle = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting article", { id: data.id });
    try {
      const article = await prisma.article.findUnique({
        where: { id: data.id },
      });

      if (!article) {
        return null;
      }

      return serializeArticle(article);
    } catch (error) {
      logger.error("Error getting article", { error });
      throw error;
    }
  });

/**
 * Server function to get all articles for a learning map
 */
export const getArticlesByPersonalLearningMap = createServerFn({
  method: "GET",
})
  .validator((data: { learningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting articles by learning map", {
      learningMapId: data.learningMapId,
    });
    try {
      const articles = await prisma.article.findMany({
        where: { learningMapId: data.learningMapId },
      });

      return articles.map(serializeArticle);
    } catch (error) {
      logger.error("Error getting articles by learning map", {
        error,
      });
      throw error;
    }
  });

/**
 * Server function to update an article's content
 */
export const updateArticle = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      content?: string;
      summary?: string;
      takeaways?: string[];
      tooltips?: Record<string, string>;
    }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Updating article", {
      id: data.id,
      hasContent: !!data.content,
      hasSummary: !!data.summary,
      hasTakeaways: !!data.takeaways,
    });

    try {
      // Check if the article exists
      const existingArticle = await prisma.article.findUnique({
        where: { id: data.id },
      });

      if (!existingArticle) {
        throw new Error(`Article not found: ${data.id}`);
      }

      // Update the article
      logger.info("Update data being sent to Prisma:", {
        updateData: JSON.stringify(data),
        updateDataType: typeof data,
      });

      const updatedArticle = await prisma.article.update({
        where: { id: data.id },
        data: {
          ...(data.content !== undefined ? { content: data.content } : {}),
          ...(data.summary !== undefined ? { summary: data.summary } : {}),
          ...(data.takeaways !== undefined
            ? { takeaways: data.takeaways }
            : {}),
          ...(data.tooltips !== undefined ? { tooltips: data.tooltips } : {}),
        },
      });

      logger.info("Article updated successfully", { id: updatedArticle.id });

      return serializeArticle(updatedArticle);
    } catch (error) {
      logger.error("Error updating article", { error });
      throw error;
    }
  });

/**
 * Server function to delete an article
 */
export const deleteArticle = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Deleting article", { id: data.id });
    try {
      // Check if the article exists
      const existingArticle = await prisma.article.findUnique({
        where: { id: data.id },
      });

      if (!existingArticle) {
        throw new Error(`Article not found: ${data.id}`);
      }

      // Delete the article
      await prisma.article.delete({
        where: { id: data.id },
      });

      logger.info("Article deleted successfully", { id: data.id });
      return { success: true, id: data.id };
    } catch (error) {
      logger.error("Error deleting article", { error });
      throw error;
    }
  });

/**
 * Server function to get the root article for a learning map
 */
export const getRootArticle = createServerFn({ method: "GET" })
  .validator((data: { learningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting root article", {
      learningMapId: data.learningMapId,
    });
    try {
      const article = await prisma.article.findFirst({
        where: {
          learningMapId: data.learningMapId,
          isRoot: true,
        },
      });

      if (!article) {
        return null;
      }

      return serializeArticle(article);
    } catch (error) {
      logger.error("Error getting root article", { error });
      throw error;
    }
  });

/**
 * Server function to create a new article in response to a question,
 * linking it to a parent article
 */
export const createArticleFromQuestion = createServerFn({ method: "POST" })
  .validator(
    (data: {
      learningMapId: string;
      parentArticleId: string;
      questionText: string;
    }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Creating article from question", {
      learningMapId: data.learningMapId,
      parentArticleId: data.parentArticleId,
      questionText: data.questionText,
    });

    try {
      return await prisma.$transaction(async (tx) => {
        const existingMap = await tx.learningMap.findUnique({
          where: { id: data.learningMapId },
        });

        if (!existingMap) {
          throw new Error(`Learning map not found: ${data.learningMapId}`);
        }

        const parentArticle = await tx.article.findUnique({
          where: { id: data.parentArticleId },
        });

        if (!parentArticle) {
          throw new Error(`Parent article not found: ${data.parentArticleId}`);
        }

        // 1. Create the child article first
        const childArticle = await tx.article.create({
          data: {
            content: "",
            learningMapId: data.learningMapId,
            isRoot: false,
            summary: "",
            takeaways: [],
          },
        });

        // 2. Create the question linking parent and child articles
        const question = await tx.question.create({
          data: {
            text: data.questionText,
            learningMapId: data.learningMapId,
            parentArticleId: data.parentArticleId,
            childArticleId: childArticle.id,
          },
        });

        const result = serializeArticle(childArticle);

        logger.info("Article created from question successfully", {
          articleId: childArticle.id,
          questionId: question.id,
        });

        return result;
      });
    } catch (error) {
      logger.error("Error creating article from question", { error });
      throw error;
    }
  });

/**
 * Server function to get the learning map and subject for an article
 */
export const getLearningMapAndSubjectForArticle = createServerFn({
  method: "GET",
})
  .validator((data: { articleId: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      article: ReturnType<typeof serializeArticle>;
      learningMap: ReturnType<typeof serializeLearningMap>;
      subject: ReturnType<typeof serializeSubject>;
    }> => {
      logger.info("Getting learning map and subject for article", {
        articleId: data.articleId,
      });
      try {
        const article = await prisma.article.findUnique({
          where: { id: data.articleId },
          include: {
            learningMap: {
              include: {
                subject: true,
                articles: true,
                questions: true,
              },
            },
          },
        });

        if (!article) {
          logger.error("Article not found", { articleId: data.articleId });
          throw new Error(`Article not found: ${data.articleId}`);
        }

        const { learningMap } = article;
        const { subject, ...learningMapWithoutSubject } = learningMap;
        
        // Ensure all articles in the learning map have summaries and takeaways
        await ensureLearningMapContent(learningMap.id);
        
        // Refetch the learning map with updated content
        const updatedLearningMap = await prisma.learningMap.findUnique({
          where: { id: learningMap.id },
          include: {
            articles: true,
            questions: true,
          },
        });

        return {
          article: serializeArticle(article),
          learningMap: serializeLearningMap(updatedLearningMap!),
          subject: serializeSubject(subject),
        };
      } catch (error) {
        logger.error("Error getting learning map and subject for article", {
          error,
          articleId: data.articleId,
        });
        throw error;
      }
    }
  );

/**
 * Server function to get a question by child article ID
 */
export const getQuestionByChildArticleId = createServerFn({ method: "GET" })
  .validator((data: { childArticleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting question by child article ID", {
      childArticleId: data.childArticleId,
    });
    try {
      const question = await prisma.question.findFirst({
        where: { childArticleId: data.childArticleId },
        include: {
          parentArticle: true,
        },
      });

      if (!question) {
        logger.info("No question found for child article", {
          childArticleId: data.childArticleId,
        });
        return null;
      }

      return {
        question: {
          id: question.id,
          text: question.text,
          learningMapId: question.learningMapId,
          parentArticleId: question.parentArticleId,
          childArticleId: question.childArticleId,
          createdAt: question.createdAt.toISOString(),
          updatedAt: question.updatedAt.toISOString(),
        },
        parentArticle: question.parentArticle
          ? serializeArticle(question.parentArticle)
          : null,
      };
    } catch (error) {
      logger.error("Error getting question by child article ID", {
        error,
        childArticleId: data.childArticleId,
      });
      throw error;
    }
  });
