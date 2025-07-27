import React, { useCallback } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  Edge,
} from "@xyflow/react";
import ConversationNode from "./react-flow/conversation-node";
import QuestionNode from "./react-flow/question-node";
import { SerializedLearningMap } from "@/types/serialized";
import { useLearningMapElkLayout } from "@/hooks/use-react-flow-layout";

interface LearningMapFlowProps {
  learningMap: SerializedLearningMap | null | undefined;
  onNodeClick?: (nodeId: string) => void;
  layoutDirection?: "UP" | "DOWN" | "LEFT" | "RIGHT";
}

// Define node types for React Flow
const nodeTypes = {
  conversationNode: ConversationNode,
  questionNode: QuestionNode,
};

const LearningMapFlow: React.FC<LearningMapFlowProps> = ({
  learningMap,
  onNodeClick,
  layoutDirection = "DOWN",
}) => {
  // Use the ELK layout algorithm to automatically position nodes
  const { nodes, edges, isLayouting, error } = useLearningMapElkLayout(
    learningMap,
    { direction: layoutDirection }
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: any) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // Default edge options
  const defaultEdgeOptions = {
    type: "smoothstep" as const,
    animated: true,
  };

  // Show loading state while layouting
  if (isLayouting) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg">Calculating optimal layout...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <p>Error loading learning map: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
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
          defaultEdgeOptions={defaultEdgeOptions}
        >
          <Background color="#f0f0f0" gap={24} size={1} />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default LearningMapFlow;
