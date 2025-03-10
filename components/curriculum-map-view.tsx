import { Button } from "@/components/ui/button";
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { CurriculumMapNodeData } from "@/types/curriculum-map";
import { cn } from "@/lib/utils";

const nodeTypes = { normalNode: Node };

function FlowWithProvider({
  nodes,
  edges,
  onNodeClick,
  isPanel = false,
}: {
  nodes: ReactFlowNode<CurriculumMapNodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<CurriculumMapNodeData>) => void;
  isPanel?: boolean;
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={(e, node) => {
        e.preventDefault();
        onNodeClick(node);
      }}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{
        padding: isPanel ? 0.2 : 0.4,
        minZoom: isPanel ? 0.1 : 0.4,
        maxZoom: isPanel ? 0.8 : 1.2,
      }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={isPanel ? 0.1 : 0.4}
      maxZoom={isPanel ? 0.8 : 1.2}
    />
  );
}

interface CurriculumMapViewProps {
  nodes: ReactFlowNode<CurriculumMapNodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<CurriculumMapNodeData>) => void;
  onReset: () => void;
  isPanel?: boolean;
}

export default function CurriculumMapView({
  nodes,
  edges,
  onNodeClick,
  onReset,
  isPanel = false,
}: CurriculumMapViewProps) {
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
