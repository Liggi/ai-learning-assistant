import { Node, Edge } from "@xyflow/react";

export interface RoadmapNodeData {
  [key: string]: unknown;
  status: "not-started" | "in-progress" | "completed";
  label: string;
  title: string;
  description: string;
}

export type RoadmapNode = Node<RoadmapNodeData>;
export type RoadmapEdge = Edge;

export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
}

export interface CreateRoadmapNodeData {
  subjectId: string;
  title: string;
  description: string;
  type: string;
  position: { x: number; y: number };
}

export interface CreateRoadmapEdgeData {
  subjectId: string;
  sourceId: string;
  targetId: string;
}
