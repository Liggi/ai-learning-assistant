import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "QuestionService", enabled: true });

/**
 * Server function to create a new question
 */
export const createQuestion = createServerFn({ method: "POST" })
  .validator((data: { articleId: string; text: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Creating question", {
      articleId: data.articleId,
    });
    try {
      // Check if the article exists
      const existingArticle = await prisma.article.findUnique({
        where: { id: data.articleId },
      });

      if (!existingArticle) {
        throw new Error(`Article not found: ${data.articleId}`);
      }

      // Create the question
      const question = await prisma.question.create({
        data: {
          text: data.text,
          articleId: data.articleId,
        },
      });

      logger.info("Question created successfully", { id: question.id });
      return question;
    } catch (error) {
      logger.error("Error creating question", { error });
      throw error;
    }
  });

/**
 * Server function to get all questions for an article
 */
export const getQuestionsByArticle = createServerFn({ method: "GET" })
  .validator((data: { articleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting questions by article", {
      articleId: data.articleId,
    });
    try {
      const questions = await prisma.question.findMany({
        where: { articleId: data.articleId },
        orderBy: { createdAt: "asc" },
      });

      return questions;
    } catch (error) {
      logger.error("Error getting questions by article", { error });
      throw error;
    }
  });
