import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { Logger } from "@/lib/logger";
import { ArticleMetadata } from "@/types/serialized";
import { serializeArticle } from "@/types/serializers";
import { fromPrismaJson } from "@/lib/prisma-utils";
import { generateSummary } from "@/features/generators/article-summary";

const logger = new Logger({ context: "ArticleService", enabled: true });

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
        include: {
          questions: true,
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
 * Server function to create a new article from a question
 * This establishes the relationship between a question and the article that answers it
 */
export const createArticleFromQuestion = createServerFn({ method: "POST" })
  .validator((data: { questionId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Creating article from question", {
      questionId: data.questionId,
    });

    try {
      // 1. Get the question with its source article
      const question = await prisma.question.findUnique({
        where: { id: data.questionId },
        include: { sourceArticle: true },
      });

      if (!question) throw new Error(`Question not found: ${data.questionId}`);

      // 2. Create a new article linked to the same learning map
      const newArticle = await prisma.article.create({
        data: {
          content: "", // Will be filled by streaming
          learningMapId: question.sourceArticle.learningMapId,
          isRoot: false,
        },
      });

      // 3. Update the question to link to this article
      await prisma.question.update({
        where: { id: data.questionId },
        data: { destinationArticleId: newArticle.id },
      });

      return serializeArticle(newArticle);
    } catch (error) {
      logger.error("Error creating article from question", { error });
      throw error;
    }
  });

/**
 * Server function to get all articles for a learning map with relationships
 */
export const getArticlesWithRelationships = createServerFn({
  method: "GET",
})
  .validator((data: { learningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting articles with relationships", {
      learningMapId: data.learningMapId,
    });
    try {
      const articles = await prisma.article.findMany({
        where: { learningMapId: data.learningMapId },
        include: {
          questions: {
            include: {
              destinationArticle: true,
            },
          },
          answerToQuestions: {
            include: {
              sourceArticle: true,
            },
          },
        },
      });

      return articles.map(serializeArticle);
    } catch (error) {
      logger.error("Error getting articles with relationships", {
        error,
      });
      throw error;
    }
  });
