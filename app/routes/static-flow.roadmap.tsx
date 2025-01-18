import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { Button } from "@/components/ui/button";

import "@xyflow/react/dist/style.css";

const nodeTypes = { normalNode: Node };

const STATIC_NODES: ReactFlowNode[] = [
  // Core Concepts
  {
    id: "1",
    type: "normalNode",
    position: { x: 800, y: 0 },
    data: {
      label: "React Fundamentals",
      description: "Core concepts and basic building blocks of React",
      status: "not-started",
    },
  },
  {
    id: "2",
    type: "normalNode",
    position: { x: 400, y: 200 },
    data: {
      label: "JSX & Elements",
      description: "Understanding JSX syntax and React elements",
      status: "not-started",
    },
  },
  {
    id: "3",
    type: "normalNode",
    position: { x: 1200, y: 200 },
    data: {
      label: "Virtual DOM",
      description: "How React's Virtual DOM works and optimizes rendering",
      status: "not-started",
    },
  },

  // Components Path
  {
    id: "4",
    type: "normalNode",
    position: { x: 0, y: 400 },
    data: {
      label: "Components & Props",
      description: "Creating and composing React components",
      status: "not-started",
    },
  },
  {
    id: "5",
    type: "normalNode",
    position: { x: 0, y: 600 },
    data: {
      label: "Component Composition",
      description: "Advanced patterns for composing components",
      status: "not-started",
    },
  },
  {
    id: "6",
    type: "normalNode",
    position: { x: 0, y: 800 },
    data: {
      label: "Higher-Order Components",
      description: "Creating reusable component logic",
      status: "not-started",
    },
  },

  // State Management Path
  {
    id: "7",
    type: "normalNode",
    position: { x: 800, y: 400 },
    data: {
      label: "State & Lifecycle",
      description: "Managing component state and lifecycle",
      status: "not-started",
    },
  },
  {
    id: "8",
    type: "normalNode",
    position: { x: 800, y: 600 },
    data: {
      label: "React Hooks",
      description: "Using hooks for state and side effects",
      status: "not-started",
    },
  },
  {
    id: "9",
    type: "normalNode",
    position: { x: 800, y: 800 },
    data: {
      label: "Custom Hooks",
      description: "Creating reusable hook logic",
      status: "not-started",
    },
  },

  // Advanced State Management
  {
    id: "10",
    type: "normalNode",
    position: { x: 1600, y: 400 },
    data: {
      label: "Context API",
      description: "Managing global state with Context",
      status: "not-started",
    },
  },
  {
    id: "11",
    type: "normalNode",
    position: { x: 1600, y: 600 },
    data: {
      label: "State Management",
      description: "Redux, Zustand, and other state solutions",
      status: "not-started",
    },
  },
  {
    id: "12",
    type: "normalNode",
    position: { x: 1600, y: 800 },
    data: {
      label: "Data Fetching",
      description: "React Query, SWR, and data management",
      status: "not-started",
    },
  },

  // Performance
  {
    id: "13",
    type: "normalNode",
    position: { x: 400, y: 1000 },
    data: {
      label: "Performance",
      description: "Optimizing React application performance",
      status: "not-started",
    },
  },
  {
    id: "14",
    type: "normalNode",
    position: { x: 800, y: 1000 },
    data: {
      label: "Memoization",
      description: "Using memo, useMemo, and useCallback",
      status: "not-started",
    },
  },
  {
    id: "15",
    type: "normalNode",
    position: { x: 1200, y: 1000 },
    data: {
      label: "Code Splitting",
      description: "Lazy loading and route-based splitting",
      status: "not-started",
    },
  },
];

const STATIC_EDGES: ReactFlowEdge[] = [
  // Core to Fundamentals
  { id: "e1-2", source: "1", target: "2", type: "smoothstep" },
  { id: "e1-3", source: "1", target: "3", type: "smoothstep" },

  // Components Path
  { id: "e2-4", source: "2", target: "4", type: "smoothstep" },
  { id: "e4-5", source: "4", target: "5", type: "smoothstep" },
  { id: "e5-6", source: "5", target: "6", type: "smoothstep" },

  // State Management Path
  { id: "e1-7", source: "1", target: "7", type: "smoothstep" },
  { id: "e7-8", source: "7", target: "8", type: "smoothstep" },
  { id: "e8-9", source: "8", target: "9", type: "smoothstep" },

  // Advanced State Management Path
  { id: "e3-10", source: "3", target: "10", type: "smoothstep" },
  { id: "e10-11", source: "10", target: "11", type: "smoothstep" },
  { id: "e11-12", source: "11", target: "12", type: "smoothstep" },

  // Cross Connections
  { id: "e7-10", source: "7", target: "10", type: "smoothstep" },
  { id: "e8-11", source: "8", target: "11", type: "smoothstep" },

  // Performance Path
  { id: "e6-13", source: "6", target: "13", type: "smoothstep" },
  { id: "e9-13", source: "9", target: "13", type: "smoothstep" },
  { id: "e12-13", source: "12", target: "13", type: "smoothstep" },
  { id: "e13-14", source: "13", target: "14", type: "smoothstep" },
  { id: "e14-15", source: "14", target: "15", type: "smoothstep" },
];

function ClientOnlyReactFlow({
  onNodeClick,
}: {
  onNodeClick: (node: ReactFlowNode) => void;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={STATIC_NODES}
        edges={STATIC_EDGES}
        fitView
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={(_, node) => onNodeClick(node)}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

export const Route = createFileRoute("/static-flow/roadmap")({
  component: StaticRoadmapRoute,
});

function StaticRoadmapRoute() {
  const navigate = useNavigate();

  const handleNodeClick = (node: ReactFlowNode) => {
    navigate({ to: "/static-flow/chat", search: { nodeId: node.id } });
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }} className="bg-background">
      <ClientOnlyReactFlow onNodeClick={handleNodeClick} />
      <Button
        variant="outline"
        className="absolute top-4 left-4"
        onClick={() => navigate({ to: "/static-flow" })}
      >
        Create a new roadmap
      </Button>
    </div>
  );
}
