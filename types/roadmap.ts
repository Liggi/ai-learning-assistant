import { z } from "zod";

export const roadmapNodeDataSchema = z.object({
  label: z.string(),
  description: z.string(),
  status: z.enum(["not-started", "in-progress", "completed"]),
});

export const roadmapNodeSchema = z.object({
  id: z.string(),
  type: z.literal("normalNode"),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: roadmapNodeDataSchema,
});

export const roadmapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.literal("smoothstep"),
});

export const roadmapSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  nodes: z.array(roadmapNodeSchema),
  edges: z.array(roadmapEdgeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RoadmapNodeData = z.infer<typeof roadmapNodeDataSchema>;
export type RoadmapNode = z.infer<typeof roadmapNodeSchema>;
export type RoadmapEdge = z.infer<typeof roadmapEdgeSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
