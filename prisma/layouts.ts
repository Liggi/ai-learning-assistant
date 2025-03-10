import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { LayoutSchema } from "./generated/zod";
import {
  layoutSchema,
  layoutDataSchema,
  LayoutData,
} from "@/types/personal-learning-map";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "LayoutService" });

// Type definitions using Prisma and Zod generated schemas
type PrismaLayout = z.infer<typeof LayoutSchema>;

// Serialized type for client-side use
export type SerializedLayout = {
  id: string;
  personalLearningMapId: string;
  nodes: any[];
  edges: any[];
  nodeHeights: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Serializes a Layout from the database to a client-friendly format
 * Converts Date objects to ISO strings and properly parses the JSON fields
 */
export function serializeLayout(layout: PrismaLayout): SerializedLayout {
  return {
    ...layout,
    createdAt: layout.createdAt.toISOString(),
    updatedAt: layout.updatedAt.toISOString(),
    nodes: JSON.parse(JSON.stringify(layout.nodes)),
    edges: JSON.parse(JSON.stringify(layout.edges)),
    nodeHeights: JSON.parse(JSON.stringify(layout.nodeHeights)),
  };
}

/**
 * Creates a new layout for a personal learning map
 */
export const createLayout = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        personalLearningMapId: z.string().uuid(),
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
        nodeHeights: z.record(z.string(), z.number()),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      logger.info(
        `Creating layout for personal learning map ${data.personalLearningMapId}`
      );

      const layout = await prisma.layout.create({
        data: {
          personalLearningMapId: data.personalLearningMapId,
          nodes: data.nodes as any,
          edges: data.edges as any,
          nodeHeights: data.nodeHeights,
        },
      });

      return serializeLayout(layout);
    } catch (error) {
      logger.error("Error creating layout", { error });
      throw error;
    }
  });

/**
 * Gets a layout by personal learning map ID
 */
export const getLayoutByPersonalLearningMapId = createServerFn({
  method: "GET",
})
  .validator((data: unknown) =>
    z
      .object({
        personalLearningMapId: z.string().uuid(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      logger.info(
        `Getting layout for personal learning map ${data.personalLearningMapId}`
      );

      const layout = await prisma.layout.findUnique({
        where: {
          personalLearningMapId: data.personalLearningMapId,
        },
      });

      if (!layout) {
        logger.warn(
          `No layout found for personal learning map ${data.personalLearningMapId}`
        );
        return null;
      }

      return serializeLayout(layout);
    } catch (error) {
      logger.error("Error getting layout", { error });
      throw error;
    }
  });

/**
 * Updates an existing layout
 */
export const updateLayout = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        personalLearningMapId: z.string().uuid(),
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
        nodeHeights: z.record(z.string(), z.number()),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      logger.info(
        `Updating layout for personal learning map ${data.personalLearningMapId}`
      );

      const layout = await prisma.layout.update({
        where: {
          personalLearningMapId: data.personalLearningMapId,
        },
        data: {
          nodes: data.nodes as any,
          edges: data.edges as any,
          nodeHeights: data.nodeHeights,
        },
      });

      return serializeLayout(layout);
    } catch (error) {
      logger.error("Error updating layout", { error });
      throw error;
    }
  });

/**
 * Creates or updates a layout (upsert operation)
 */
export const upsertLayout = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        personalLearningMapId: z.string().uuid(),
        nodes: z.array(z.any()),
        edges: z.array(z.any()),
        nodeHeights: z.record(z.string(), z.number()),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      logger.info(
        `Upserting layout for personal learning map ${data.personalLearningMapId}`
      );

      const layout = await prisma.layout.upsert({
        where: {
          personalLearningMapId: data.personalLearningMapId,
        },
        update: {
          nodes: data.nodes as any,
          edges: data.edges as any,
          nodeHeights: data.nodeHeights,
        },
        create: {
          personalLearningMapId: data.personalLearningMapId,
          nodes: data.nodes as any,
          edges: data.edges as any,
          nodeHeights: data.nodeHeights,
        },
      });

      return serializeLayout(layout);
    } catch (error) {
      logger.error("Error upserting layout", { error });
      throw error;
    }
  });

/**
 * Deletes a layout
 */
export const deleteLayout = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        personalLearningMapId: z.string().uuid(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    try {
      logger.info(
        `Deleting layout for personal learning map ${data.personalLearningMapId}`
      );

      await prisma.layout.delete({
        where: {
          personalLearningMapId: data.personalLearningMapId,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting layout", { error });
      throw error;
    }
  });
