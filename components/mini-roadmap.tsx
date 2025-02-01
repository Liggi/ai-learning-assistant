import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useRoadmapStore } from "@/features/roadmap/store";
import Node from "@/components/react-flow/node";

const nodeTypes = { normalNode: Node };

interface MiniRoadmapProps {
  onNodeClick: (nodeId: string) => void;
  selectedNodeId?: string;
}

export default function MiniRoadmap({
  onNodeClick,
  selectedNodeId,
}: MiniRoadmapProps) {
  const { nodes, edges } = useRoadmapStore();

  // Create a miniature version of the nodes
  const miniNodes = nodes.map((node) => ({
    ...node,
    style: {
      ...node.style,
      transform: "scale(0.7)",
    },
  }));

  return (
    <div className="w-full h-full min-h-[300px]">
      <ReactFlowProvider>
        <ReactFlow
          nodes={miniNodes}
          edges={edges}
          onNodeClick={(_, node) => onNodeClick(node.id)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            minZoom: 0.5,
            maxZoom: 1.5,
            padding: 0.3,
          }}
          minZoom={0.5}
          maxZoom={1.5}
          attributionPosition="bottom-left"
        />
      </ReactFlowProvider>
    </div>
  );
}
