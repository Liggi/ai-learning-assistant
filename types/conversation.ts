import { Node, Edge } from "@xyflow/react";
import { z } from "zod";

// Node data interface
export interface ConversationNodeData extends Record<string, unknown> {
  id: string;
  text: string;
  summary: string;
  isUser: boolean;
  content?: {
    summary: string;
    takeaways: string[];
  };
}

// Type definitions for nodes and edges
export type ConversationNode = Node<ConversationNodeData>;
export type ConversationEdge = Edge;

// Zod schemas for validation
export const contentSchema = z.object({
  summary: z.string(),
  takeaways: z.array(z.string()),
});

export const nodeDataSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    summary: z.string(),
    isUser: z.boolean(),
    content: contentSchema.optional(),
  })
  .passthrough(); // Allow additional properties for Record<string, unknown>

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const nodeSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    position: positionSchema,
    data: nodeDataSchema,
  })
  .passthrough(); // Allow additional properties from Node type

export const edgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
  })
  .passthrough(); // Allow additional properties from Edge type

export const nodesSchema = z.array(nodeSchema);
export const edgesSchema = z.array(edgeSchema);
export const nodeHeightsSchema = z.record(z.string(), z.number());

export const layoutDataSchema = z.object({
  nodes: nodesSchema,
  edges: edgesSchema,
  nodeHeights: nodeHeightsSchema,
});

// Layout types
export interface LayoutData {
  nodes: ConversationNode[];
  edges: ConversationEdge[];
  nodeHeights: Record<string, number>;
}

// Message content type
export interface MessageContent {
  summary: string;
  takeaways: string[];
}

// Message type
export interface MessageData {
  id: string;
  text: string;
  isUser: boolean;
  parentId?: string;
  content?: MessageContent;
  tooltips?: Record<string, string>;
}
