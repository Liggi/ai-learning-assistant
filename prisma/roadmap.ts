import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { RoadmapSchema } from "./generated/zod";
import { roadmapNodeSchema, roadmapEdgeSchema } from "@/types/roadmap";

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
    try {
      // Validate input data
      const validatedData = saveRoadmapInputSchema.parse(data);

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

      console.log("Saving roadmap");

      // Upsert the roadmap record
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
      const serializedRoadmap = {
        ...roadmap,
        createdAt: roadmap.createdAt.toISOString(),
        updatedAt: roadmap.updatedAt.toISOString(),
        nodes: JSON.parse(JSON.stringify(roadmap.nodes)),
        edges: JSON.parse(JSON.stringify(roadmap.edges)),
      };

      return serializedRoadmap;
    } catch (error) {
      throw error;
    }
  });
