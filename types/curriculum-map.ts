import { z } from "zod";

// Keeping the same structure as the previous Roadmap
export const curriculumMapNodeDataSchema = z.object({
  label: z.string(),
  description: z.string(),
  status: z.enum(["not-started", "in-progress", "completed"]),
});

export const curriculumMapNodeSchema = z.object({
  id: z.string(),
  type: z.literal("normalNode"),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: curriculumMapNodeDataSchema,
});

export const curriculumMapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.literal("smoothstep"),
});

export const curriculumMapSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  nodes: z.array(curriculumMapNodeSchema),
  edges: z.array(curriculumMapEdgeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CurriculumMapNodeData = z.infer<typeof curriculumMapNodeDataSchema>;
export type CurriculumMapNode = z.infer<typeof curriculumMapNodeSchema>;
export type CurriculumMapEdge = z.infer<typeof curriculumMapEdgeSchema>;
export type CurriculumMap = z.infer<typeof curriculumMapSchema>;
