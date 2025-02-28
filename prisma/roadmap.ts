import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { RoadmapSchema } from "./generated/zod";
import { roadmapNodeSchema, roadmapEdgeSchema } from "@/types/roadmap";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "RoadmapService" });

export const SerializedRoadmapSchema = RoadmapSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: roadmapNodeSchema.array(),
  edges: roadmapEdgeSchema.array(),
});

export type SerializedRoadmap = z.infer<typeof SerializedRoadmapSchema>;

const saveRoadmapInputSchema = z.object({
  subjectId: z.string().uuid(),
  nodes: z.array(roadmapNodeSchema),
  edges: z.array(roadmapEdgeSchema),
});

export const saveRoadmap = createServerFn({ method: "POST" })
  .validator((data: { subjectId: string; nodes: any; edges: any }) => data)
  .handler(async ({ data }) => {
    logger.info("Starting roadmap save process", { subjectId: data.subjectId });

    try {
      // Validate input data
      logger.debug("Validating input data");
      const validatedData = saveRoadmapInputSchema.parse(data);
      logger.debug("Input data validation successful");

      // Verify subject exists
      logger.debug("Verifying subject exists");
      const subject = await prisma.subject.findUnique({
        where: { id: validatedData.subjectId },
      });

      if (!subject) {
        logger.error("Subject not found", {
          subjectId: validatedData.subjectId,
        });
        throw new Error(`Subject not found: ${validatedData.subjectId}`);
      }
      logger.debug("Subject verification successful");

      // Ensure nodes and edges are valid JSON
      logger.debug("Preparing data for database");
      const sanitizedNodes = JSON.parse(JSON.stringify(validatedData.nodes));
      const sanitizedEdges = JSON.parse(JSON.stringify(validatedData.edges));

      // Upsert the roadmap record
      logger.debug("Upserting roadmap");
      const roadmap = await prisma.roadmap.upsert({
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

      // Convert Date objects AND ensure JSON fields are plain objects
      logger.debug("Serializing roadmap data");
      const serializedRoadmap = {
        ...roadmap,
        createdAt: roadmap.createdAt.toISOString(),
        updatedAt: roadmap.updatedAt.toISOString(),
        nodes: JSON.parse(JSON.stringify(roadmap.nodes)),
        edges: JSON.parse(JSON.stringify(roadmap.edges)),
      };

      logger.info("Roadmap saved successfully", { subjectId: data.subjectId });
      return serializedRoadmap;
    } catch (error) {
      logger.error("Error in roadmap save process", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        data: {
          subjectId: data.subjectId,
          nodesLength: Array.isArray(data.nodes)
            ? data.nodes.length
            : typeof data.nodes,
          edgesLength: Array.isArray(data.edges)
            ? data.edges.length
            : typeof data.edges,
        },
      });
      throw error;
    }
  });
