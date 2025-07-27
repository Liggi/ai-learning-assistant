import { Node, Edge } from "@xyflow/react";
import { z } from "zod";

// Node data interface for learning map visualization
export interface ArticleNodeData extends Record<string, unknown> {
  id: string;
  content: string;
  summary: string;
  isRoot: boolean;
}

// Type definitions for nodes and edges in the learning map
export type ArticleNode = Node<ArticleNodeData>;
export type QuestionEdge = Edge;

// Zod schemas for validation
export const articleNodeDataSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    summary: z.string(),
    isRoot: z.boolean(),
  })
  .passthrough(); // Allow additional properties for Record<string, unknown>

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const articleNodeSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    position: positionSchema,
    data: articleNodeDataSchema,
  })
  .passthrough(); // Allow additional properties from Node type

export const questionEdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    data: z
      .object({
        text: z.string(),
        isImplicit: z.boolean().optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow additional properties from Edge type

export const articleNodesSchema = z.array(articleNodeSchema);
export const questionEdgesSchema = z.array(questionEdgeSchema);
export const nodeHeightsSchema = z.record(z.string(), z.number());

export const layoutDataSchema = z.object({
  nodes: articleNodesSchema,
  edges: questionEdgesSchema,
  nodeHeights: nodeHeightsSchema,
});

// Article schema
export const articleSchema = z.object({
  id: z.string(),
  content: z.string(),
  summary: z.string(),
  takeaways: z.array(z.string()),
  learningMapId: z.string(),
  isRoot: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contextualTooltips: z.array(z.any()).optional(), // Will be refined in tooltip.ts
});

// UserQuestion schema
export const userQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  learningMapId: z.string(),
  sourceArticleId: z.string(),
  destinationArticleId: z.string(),
  isImplicit: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// MapContext schema
export const mapContextSchema = z.object({
  id: z.string(),
  curriculumMapId: z.string(),
  moduleId: z.string(),
  learningMapId: z.string(),
  subjectId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Layout schema
export const layoutSchema = z.object({
  id: z.string(),
  learningMapId: z.string(),
  nodes: articleNodesSchema,
  edges: questionEdgesSchema,
  nodeHeights: nodeHeightsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// PersonalLearningMap schema
export const personalLearningMapSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  articles: z.array(articleSchema).optional(),
  userQuestions: z.array(userQuestionSchema).optional(),
  layout: layoutSchema.optional(),
  mapContext: mapContextSchema.optional(),
});

// Type exports
export type Article = z.infer<typeof articleSchema>;
export type UserQuestion = z.infer<typeof userQuestionSchema>;
export type MapContext = z.infer<typeof mapContextSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type PersonalLearningMap = z.infer<typeof personalLearningMapSchema>;

// Layout data type
export interface LayoutData {
  nodes: ArticleNode[];
  edges: QuestionEdge[];
  nodeHeights: Record<string, number>;
}

// Suggested question type (not stored in database)
export interface SuggestedQuestion {
  id: string;
  text: string;
  sourceArticleId: string;
}
