import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { NodeData } from "@/components/chat-screen";
import { useEffect, useRef } from "react";

const nodeTypes = { normalNode: Node };

console.log("[Debug] RoadmapView file is loaded in the JS bundle");

function FlowWithProvider({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: ReactFlowNode<NodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<NodeData>) => void;
}) {
  console.log("[Debug] FlowWithProvider render attempt", {
    nodes,
    edges,
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={(_, node) => onNodeClick(node)}
      nodeTypes={nodeTypes}
      fitView
    />
  );
}

interface RoadmapViewProps {
  nodes: ReactFlowNode<NodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<NodeData>) => void;
  onReset: () => void;
}

export default function RoadmapView({
  nodes,
  edges,
  onNodeClick,
  onReset,
}: RoadmapViewProps) {
  console.log("[Debug] RoadmapView render attempt", {
    hasNodes: nodes.length > 0,
    hasEdges: edges.length > 0,
    timestamp: new Date().toISOString(),
  });

  return (
    <div className="absolute inset-0 bg-background">
      <ReactFlowProvider>
        <FlowWithProvider
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
        />
      </ReactFlowProvider>
      <Button onClick={onReset} className="absolute top-4 right-4 z-[1000]">
        Reset
      </Button>
    </div>
  );
}
