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

export const saveRoadmap = createServerFn({ method: "POST" })
  .validator((data: { subjectId: string; nodes: any; edges: any }) => data)
  .handler(async ({ data }) => {
    console.log("Saving roadmap for subject:", data.subjectId);
    try {
      // Upsert the roadmap record
      const roadmap = await prisma.roadmap.upsert({
        where: { subjectId: data.subjectId },
        update: {
          nodes: data.nodes,
          edges: data.edges,
        },
        create: {
          subjectId: data.subjectId,
          nodes: data.nodes,
          edges: data.edges,
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

      console.log("Roadmap saved successfully:", serializedRoadmap);
      return serializedRoadmap;
    } catch (error) {
      console.error("Error saving roadmap to DB:", error);
      throw error;
    }
  });
