import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { CurriculumMapSchema } from "./generated/zod";
import {
  curriculumMapNodeSchema,
  curriculumMapEdgeSchema,
} from "@/types/curriculum-map";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "CurriculumMapService" });

// Type definitions using Prisma and Zod generated schemas
type PrismaCurriculumMap = z.infer<typeof CurriculumMapSchema>;

// Serialized schema definition
export const SerializedCurriculumMapSchema = CurriculumMapSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: curriculumMapNodeSchema.array(),
  edges: curriculumMapEdgeSchema.array(),
});

export type SerializedCurriculumMap = z.infer<
  typeof SerializedCurriculumMapSchema
>;

/**
 * Serializes a CurriculumMap from the database to a client-friendly format
 * Converts Date objects to ISO strings and ensures JSON fields are properly parsed
 */
export function serializeCurriculumMap(
  map: PrismaCurriculumMap
): SerializedCurriculumMap {
  return SerializedCurriculumMapSchema.parse({
    ...map,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
    nodes: JSON.parse(JSON.stringify(map.nodes)),
    edges: JSON.parse(JSON.stringify(map.edges)),
  });
}

// Input validation schema for saving curriculum maps
const saveCurriculumMapInputSchema = z.object({
  subjectId: z.string().uuid(),
  nodes: z.array(curriculumMapNodeSchema),
  edges: z.array(curriculumMapEdgeSchema),
});

/**
 * Server function to save a curriculum map for a subject
 * Creates a new map or updates an existing one
 */
export const saveCurriculumMap = createServerFn({ method: "POST" })
  .validator((data: { subjectId: string; nodes: any; edges: any }) => data)
  .handler(async ({ data }) => {
    try {
      // Validate input data
      const validatedData = saveCurriculumMapInputSchema.parse(data);
      logger.info("Saving curriculum map", {
        subjectId: validatedData.subjectId,
      });

      // Verify subject exists
      const subject = await prisma.subject.findUnique({
        where: { id: validatedData.subjectId },
      });

      if (!subject) {
        throw new Error(`Subject not found: ${validatedData.subjectId}`);
      }

      // Ensure nodes and edges are valid JSON
      const sanitizedNodes = JSON.parse(JSON.stringify(validatedData.nodes));
      const sanitizedEdges = JSON.parse(JSON.stringify(validatedData.edges));

      // Upsert the curriculum map record
      const curriculumMap = await prisma.curriculumMap.upsert({
        where: { subjectId: validatedData.subjectId },
        update: {
          nodes: sanitizedNodes,
          edges: sanitizedEdges,
        },
        create: {
          subjectId: validatedData.subjectId,
          nodes: sanitizedNodes,
          edges: sanitizedEdges,
        },
      });

      return serializeCurriculumMap(curriculumMap);
    } catch (error) {
      logger.error("Error saving curriculum map", { error });
      throw error;
    }
  });

/**
 * Server function to get a curriculum map by subject ID
 */
export const getCurriculumMap = createServerFn({ method: "GET" })
  .validator((data: { subjectId: string }) => data)
  .handler(async ({ data }): Promise<SerializedCurriculumMap | null> => {
    try {
      logger.info("Getting curriculum map", { subjectId: data.subjectId });

      const curriculumMap = await prisma.curriculumMap.findUnique({
        where: { subjectId: data.subjectId },
      });

      if (!curriculumMap) {
        return null;
      }

      return serializeCurriculumMap(curriculumMap);
    } catch (error) {
      logger.error("Error getting curriculum map", { error });
      throw error;
    }
  });
