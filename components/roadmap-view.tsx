import { Button } from "@/components/ui/button";
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  useReactFlow,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { RoadmapNodeData } from "@/features/roadmap/store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const nodeTypes = { normalNode: Node };

function FlowWithProvider({
  nodes,
  edges,
  onNodeClick,
  isPanel = false,
}: {
  nodes: ReactFlowNode<RoadmapNodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<RoadmapNodeData>) => void;
  isPanel?: boolean;
}) {
  const { setCenter } = useReactFlow();

  useEffect(() => {
    // Focus on the first node if it exists
    if (nodes.length > 0) {
      const firstNode = nodes[0];
      // Account for node dimensions (200x100) to center it properly
      setCenter(
        firstNode.position.x + 100, // Add half the width
        firstNode.position.y + 50, // Add half the height
        {
          zoom: 1,
        }
      );
    }
  }, [nodes, setCenter, isPanel]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={(_, node) => onNodeClick(node)}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={isPanel ? 0.1 : 0.4}
      maxZoom={isPanel ? 0.8 : 1.2}
    />
  );
}

interface RoadmapViewProps {
  nodes: ReactFlowNode<RoadmapNodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<RoadmapNodeData>) => void;
  onReset: () => void;
  isPanel?: boolean;
}

export default function RoadmapView({
  nodes,
  edges,
  onNodeClick,
  onReset,
  isPanel = false,
}: RoadmapViewProps) {
  return (
    <div
      className={cn(
        "bg-background",
        isPanel ? "w-full h-full" : "absolute inset-0"
      )}
    >
      <ReactFlowProvider>
        <FlowWithProvider
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          isPanel={isPanel}
        />
      </ReactFlowProvider>
    </div>
  );
}
