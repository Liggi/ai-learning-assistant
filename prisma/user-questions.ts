import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { UserQuestionSchema } from "./generated/zod";
import { userQuestionSchema } from "@/types/personal-learning-map";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "UserQuestionService" });

// Type definitions using Prisma and Zod generated schemas
type PrismaUserQuestion = z.infer<typeof UserQuestionSchema>;

/**
 * Serializes a UserQuestion from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeUserQuestion(userQuestion: PrismaUserQuestion) {
  return {
    ...userQuestion,
    createdAt: userQuestion.createdAt.toISOString(),
    updatedAt: userQuestion.updatedAt.toISOString(),
  };
}

/**
 * Server function to create a new user question connecting two articles
 */
export const createUserQuestion = createServerFn({ method: "POST" })
  .validator(
    (data: {
      personalLearningMapId: string;
      sourceArticleId: string;
      destinationArticleId: string;
      text: string;
      isImplicit?: boolean;
    }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Creating user question", {
      personalLearningMapId: data.personalLearningMapId,
      sourceArticleId: data.sourceArticleId,
      destinationArticleId: data.destinationArticleId,
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

      // Check if the source article exists
      const sourceArticle = await prisma.article.findUnique({
        where: { id: data.sourceArticleId },
      });

      if (!sourceArticle) {
        throw new Error(`Source article not found: ${data.sourceArticleId}`);
      }

      // Check if the destination article exists
      const destinationArticle = await prisma.article.findUnique({
        where: { id: data.destinationArticleId },
      });

      if (!destinationArticle) {
        throw new Error(
          `Destination article not found: ${data.destinationArticleId}`
        );
      }

      // Create the user question
      const userQuestion = await prisma.userQuestion.create({
        data: {
          text: data.text,
          personalLearningMapId: data.personalLearningMapId,
          sourceArticleId: data.sourceArticleId,
          destinationArticleId: data.destinationArticleId,
          isImplicit: data.isImplicit ?? false,
        },
      });

      logger.info("User question created successfully", {
        id: userQuestion.id,
      });
      return serializeUserQuestion(userQuestion);
    } catch (error) {
      logger.error("Error creating user question", { error });
      throw error;
    }
  });

/**
 * Server function to get a user question by ID
 */
export const getUserQuestion = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting user question", { id: data.id });
    try {
      const userQuestion = await prisma.userQuestion.findUnique({
        where: { id: data.id },
      });

      if (!userQuestion) {
        return null;
      }

      return serializeUserQuestion(userQuestion);
    } catch (error) {
      logger.error("Error getting user question", { error });
      throw error;
    }
  });

/**
 * Server function to get all user questions for a personal learning map
 */
export const getUserQuestionsByPersonalLearningMap = createServerFn({
  method: "GET",
})
  .validator((data: { personalLearningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting user questions by personal learning map", {
      personalLearningMapId: data.personalLearningMapId,
    });
    try {
      const userQuestions = await prisma.userQuestion.findMany({
        where: { personalLearningMapId: data.personalLearningMapId },
      });

      return userQuestions.map(serializeUserQuestion);
    } catch (error) {
      logger.error("Error getting user questions by personal learning map", {
        error,
      });
      throw error;
    }
  });

/**
 * Server function to get user questions by source article ID
 */
export const getUserQuestionsBySourceArticle = createServerFn({
  method: "GET",
})
  .validator((data: { sourceArticleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting user questions by source article", {
      sourceArticleId: data.sourceArticleId,
    });
    try {
      const userQuestions = await prisma.userQuestion.findMany({
        where: { sourceArticleId: data.sourceArticleId },
      });

      return userQuestions.map(serializeUserQuestion);
    } catch (error) {
      logger.error("Error getting user questions by source article", {
        error,
      });
      throw error;
    }
  });

/**
 * Server function to get user questions by destination article ID
 */
export const getUserQuestionsByDestinationArticle = createServerFn({
  method: "GET",
})
  .validator((data: { destinationArticleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting user questions by destination article", {
      destinationArticleId: data.destinationArticleId,
    });
    try {
      const userQuestions = await prisma.userQuestion.findMany({
        where: { destinationArticleId: data.destinationArticleId },
      });

      return userQuestions.map(serializeUserQuestion);
    } catch (error) {
      logger.error("Error getting user questions by destination article", {
        error,
      });
      throw error;
    }
  });

/**
 * Server function to update a user question's text
 */
export const updateUserQuestion = createServerFn({ method: "POST" })
  .validator((data: { id: string; text: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Updating user question", { id: data.id });
    try {
      // Check if the user question exists
      const existingUserQuestion = await prisma.userQuestion.findUnique({
        where: { id: data.id },
      });

      if (!existingUserQuestion) {
        throw new Error(`User question not found: ${data.id}`);
      }

      // Update the user question
      const updatedUserQuestion = await prisma.userQuestion.update({
        where: { id: data.id },
        data: {
          text: data.text,
        },
      });

      logger.info("User question updated successfully", {
        id: updatedUserQuestion.id,
      });
      return serializeUserQuestion(updatedUserQuestion);
    } catch (error) {
      logger.error("Error updating user question", { error });
      throw error;
    }
  });

/**
 * Server function to delete a user question
 */
export const deleteUserQuestion = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Deleting user question", { id: data.id });
    try {
      // Check if the user question exists
      const existingUserQuestion = await prisma.userQuestion.findUnique({
        where: { id: data.id },
      });

      if (!existingUserQuestion) {
        throw new Error(`User question not found: ${data.id}`);
      }

      // Delete the user question
      await prisma.userQuestion.delete({
        where: { id: data.id },
      });

      logger.info("User question deleted successfully", { id: data.id });
      return { success: true, id: data.id };
    } catch (error) {
      logger.error("Error deleting user question", { error });
      throw error;
    }
  });
