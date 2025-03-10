import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { ArticleSchema } from "./generated/zod";
import { articleSchema } from "@/types/personal-learning-map";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "ArticleService" });

// Type definitions using Prisma and Zod generated schemas
type PrismaArticle = z.infer<typeof ArticleSchema>;

/**
 * Serializes an Article from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeArticle(article: PrismaArticle) {
  return {
    ...article,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

/**
 * Server function to create a new article in a personal learning map
 */
export const createArticle = createServerFn({ method: "POST" })
  .validator(
    (data: {
      personalLearningMapId: string;
      content: string;
      isRoot?: boolean;
    }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Creating article", {
      personalLearningMapId: data.personalLearningMapId,
    });
    try {
      // Check if the personal learning map exists
      const existingMap = await prisma.personalLearningMap.findUnique({
        where: { id: data.personalLearningMapId },
      });

      if (!existingMap) {
        throw new Error(
          `Personal learning map not found: ${data.personalLearningMapId}`
        );
      }

      // Create the article
      const article = await prisma.article.create({
        data: {
          content: data.content,
          personalLearningMapId: data.personalLearningMapId,
          isRoot: data.isRoot ?? false,
        },
        include: {
          contextualTooltips: true,
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
        include: {
          contextualTooltips: true,
        },
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
 * Server function to get all articles for a personal learning map
 */
export const getArticlesByPersonalLearningMap = createServerFn({
  method: "GET",
})
  .validator((data: { personalLearningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting articles by personal learning map", {
      personalLearningMapId: data.personalLearningMapId,
    });
    try {
      const articles = await prisma.article.findMany({
        where: { personalLearningMapId: data.personalLearningMapId },
        include: {
          contextualTooltips: true,
        },
      });

      return articles.map(serializeArticle);
    } catch (error) {
      logger.error("Error getting articles by personal learning map", {
        error,
      });
      throw error;
    }
  });

/**
 * Server function to update an article's content
 */
export const updateArticle = createServerFn({ method: "POST" })
  .validator((data: { id: string; content: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Updating article", { id: data.id });
    try {
      // Check if the article exists
      const existingArticle = await prisma.article.findUnique({
        where: { id: data.id },
      });

      if (!existingArticle) {
        throw new Error(`Article not found: ${data.id}`);
      }

      // Update the article
      const updatedArticle = await prisma.article.update({
        where: { id: data.id },
        data: {
          content: data.content,
        },
        include: {
          contextualTooltips: true,
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

      // Delete the article (cascades to related entities)
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
 * Server function to get the root article for a personal learning map
 */
export const getRootArticle = createServerFn({ method: "GET" })
  .validator((data: { personalLearningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting root article", {
      personalLearningMapId: data.personalLearningMapId,
    });
    try {
      const article = await prisma.article.findFirst({
        where: {
          personalLearningMapId: data.personalLearningMapId,
          isRoot: true,
        },
        include: {
          contextualTooltips: true,
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
