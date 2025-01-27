import { Button } from "@/components/ui/button";
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { NodeData } from "@/components/chat-screen";

const nodeTypes = { normalNode: Node };

function FlowWithProvider({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: ReactFlowNode<NodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<NodeData>) => void;
}) {
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
