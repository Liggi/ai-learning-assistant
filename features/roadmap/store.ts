import { create } from "zustand";
import { Node, Edge } from "@xyflow/react";

export interface RoadmapNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

interface RoadmapState {
  nodes: Node<RoadmapNodeData>[];
  edges: Edge[];
  activeNodeId: string | null;
  setNodes: (nodes: Node<RoadmapNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setActiveNode: (nodeId: string) => void;
  reset: () => void;
}

export const useRoadmapStore = create<RoadmapState>((set) => ({
  nodes: [],
  edges: [],
  activeNodeId: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
  reset: () => set({ nodes: [], edges: [], activeNodeId: null }),
}));
