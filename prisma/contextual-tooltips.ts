import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { ContextualTooltipSchema } from "./generated/zod";
import {
  contextualTooltipSchema,
  tooltipBatchSchema,
} from "@/types/contextual-tooltip";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "ContextualTooltipService" });

// Type definitions using Prisma and Zod generated schemas
type PrismaContextualTooltip = z.infer<typeof ContextualTooltipSchema>;

// Serialized types
export type SerializedContextualTooltip = z.infer<
  typeof contextualTooltipSchema
>;

/**
 * Serializes a ContextualTooltip from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeContextualTooltip(
  tooltip: PrismaContextualTooltip
): SerializedContextualTooltip {
  return {
    ...tooltip,
    createdAt: tooltip.createdAt.toISOString(),
    updatedAt: tooltip.updatedAt.toISOString(),
  };
}

/**
 * Server function to create a single tooltip
 */
export const createTooltip = createServerFn({ method: "POST" })
  .validator(
    (data: { articleId: string; term: string; explanation: string }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Creating tooltip", {
      articleId: data.articleId,
      term: data.term,
    });
    try {
      // Verify article exists
      const article = await prisma.article.findUnique({
        where: { id: data.articleId },
      });

      if (!article) {
        throw new Error(`Article not found: ${data.articleId}`);
      }

      // Create tooltip
      const tooltip = await prisma.contextualTooltip.create({
        data: {
          term: data.term,
          explanation: data.explanation,
          articleId: data.articleId,
        },
      });

      logger.info("Tooltip created successfully", { id: tooltip.id });
      return serializeContextualTooltip(tooltip);
    } catch (error) {
      logger.error("Error creating tooltip", { error });
      throw error;
    }
  });

/**
 * Server function to create a batch of tooltips for an article
 */
export const createTooltipBatch = createServerFn({ method: "POST" })
  .validator(
    (data: {
      articleId: string;
      tooltips: { term: string; explanation: string }[];
    }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Creating tooltip batch", {
      articleId: data.articleId,
      count: data.tooltips.length,
    });
    try {
      // Validate input data
      const validatedTooltips = tooltipBatchSchema.parse(data.tooltips);

      // Verify article exists
      const article = await prisma.article.findUnique({
        where: { id: data.articleId },
      });

      if (!article) {
        throw new Error(`Article not found: ${data.articleId}`);
      }

      // Create tooltips in a transaction
      const createdTooltips = await prisma.$transaction(
        validatedTooltips.map((tooltip) =>
          prisma.contextualTooltip.create({
            data: {
              term: tooltip.term,
              explanation: tooltip.explanation,
              articleId: data.articleId,
            },
          })
        )
      );

      logger.info("Tooltips created successfully", {
        count: createdTooltips.length,
      });
      return createdTooltips.map(serializeContextualTooltip);
    } catch (error) {
      logger.error("Error creating tooltips", { error });
      throw error;
    }
  });

/**
 * Server function to get a tooltip by ID
 */
export const getTooltip = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting tooltip", { id: data.id });
    try {
      const tooltip = await prisma.contextualTooltip.findUnique({
        where: { id: data.id },
      });

      if (!tooltip) {
        throw new Error(`Tooltip not found: ${data.id}`);
      }

      return serializeContextualTooltip(tooltip);
    } catch (error) {
      logger.error("Error getting tooltip", { error });
      throw error;
    }
  });

/**
 * Server function to get all tooltips for an article
 */
export const getArticleTooltips = createServerFn({ method: "GET" })
  .validator((data: { articleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting article tooltips", { articleId: data.articleId });
    try {
      const tooltips = await prisma.contextualTooltip.findMany({
        where: { articleId: data.articleId },
      });

      return tooltips.map(serializeContextualTooltip);
    } catch (error) {
      logger.error("Error getting article tooltips", { error });
      throw error;
    }
  });

/**
 * Server function to update a tooltip
 */
export const updateTooltip = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; term?: string; explanation?: string }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Updating tooltip", { id: data.id });
    try {
      // Verify tooltip exists
      const existingTooltip = await prisma.contextualTooltip.findUnique({
        where: { id: data.id },
      });

      if (!existingTooltip) {
        throw new Error(`Tooltip not found: ${data.id}`);
      }

      // Update tooltip
      const updatedTooltip = await prisma.contextualTooltip.update({
        where: { id: data.id },
        data: {
          term: data.term,
          explanation: data.explanation,
        },
      });

      logger.info("Tooltip updated successfully", { id: updatedTooltip.id });
      return serializeContextualTooltip(updatedTooltip);
    } catch (error) {
      logger.error("Error updating tooltip", { error });
      throw error;
    }
  });

/**
 * Server function to delete a tooltip
 */
export const deleteTooltip = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Deleting tooltip", { id: data.id });
    try {
      // Verify tooltip exists
      const existingTooltip = await prisma.contextualTooltip.findUnique({
        where: { id: data.id },
      });

      if (!existingTooltip) {
        throw new Error(`Tooltip not found: ${data.id}`);
      }

      // Delete tooltip
      await prisma.contextualTooltip.delete({
        where: { id: data.id },
      });

      logger.info("Tooltip deleted successfully", { id: data.id });
      return { success: true, id: data.id };
    } catch (error) {
      logger.error("Error deleting tooltip", { error });
      throw error;
    }
  });

/**
 * Server function to delete all tooltips for an article
 */
export const deleteArticleTooltips = createServerFn({ method: "POST" })
  .validator((data: { articleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Deleting article tooltips", { articleId: data.articleId });
    try {
      // Verify article exists
      const article = await prisma.article.findUnique({
        where: { id: data.articleId },
      });

      if (!article) {
        throw new Error(`Article not found: ${data.articleId}`);
      }

      // Delete tooltips
      const result = await prisma.contextualTooltip.deleteMany({
        where: { articleId: data.articleId },
      });

      logger.info("Article tooltips deleted successfully", {
        count: result.count,
      });
      return { success: true, count: result.count };
    } catch (error) {
      logger.error("Error deleting article tooltips", { error });
      throw error;
    }
  });
