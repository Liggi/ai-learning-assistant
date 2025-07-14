import { ReactFlow, ReactFlowProvider, Background, type NodeProps } from "@xyflow/react";
import type { MapNode, MapEdge, MapNodeData } from "./types";
import "@xyflow/react/dist/style.css";

interface LearningMapProps {
  nodes: MapNode[];
  edges: MapEdge[];
  nodeTypes: Record<string, React.ComponentType<NodeProps<MapNode>>>;
  onNodeClick?: (nodeId: string, data: MapNodeData) => void;
  className?: string;
}

export default function LearningMap({ 
  nodes, 
  edges, 
  nodeTypes, 
  onNodeClick,
  className = "w-full h-full"
}: LearningMapProps) {
  const handleNodeClick = (_: React.MouseEvent, node: MapNode) => {
    if (onNodeClick) {
      onNodeClick(node.id, node.data);
    }
  };

  return (
    <div className={className}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#f0f0f0" gap={24} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}