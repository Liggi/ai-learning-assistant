import React, { useCallback } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
} from "@xyflow/react";
import ConversationNode from "./react-flow/conversation-node";
import ArticleNode from "./react-flow/article-node";
import QuestionNode from "./react-flow/question-node";
import { SerializedArticle, SerializedLearningMap } from "@/types/serialized";
import { useLearningMapElkLayout } from "@/hooks/use-react-flow-layout";

interface PersonalLearningMapFlowProps {
  rootArticle?: SerializedArticle | null;
  onNodeClick?: (nodeId: string) => void;
  learningMap?: SerializedLearningMap | null;
  layoutDirection?: "UP" | "DOWN" | "LEFT" | "RIGHT";
}

const nodeTypes = {
  conversationNode: ConversationNode,
  articleNode: ArticleNode,
  questionNode: QuestionNode,
};

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  rootArticle,
  onNodeClick,
  learningMap,
  layoutDirection = "DOWN",
}) => {
  // Use ELK layout if we have a learning map
  const {
    nodes: elkNodes,
    edges: elkEdges,
    isLayouting,
    error,
  } = learningMap
    ? useLearningMapElkLayout(learningMap, { direction: layoutDirection })
    : { nodes: [], edges: [], isLayouting: false, error: null };

  // For single article visualization (fallback to original behavior)
  const summary = rootArticle?.summary || "";
  const takeaways = rootArticle?.takeaways || [];
  const hasValidMetadata = !!(summary && takeaways.length > 0);

  // Only create a single node for rootArticle if we don't have a learning map
  const singleNodes =
    !learningMap && rootArticle
      ? [
          {
            id: rootArticle.id,
            type: "conversationNode",
            position: { x: 150, y: 100 },
            data: {
              id: rootArticle.id,
              content: {
                summary: rootArticle.summary,
                takeaways: rootArticle.takeaways,
              },
              isUser: false,
              isLoading: !hasValidMetadata,
              onClick: () => onNodeClick?.(rootArticle.id),
            },
          },
        ]
      : [];

  // Use either the ELK-layouted nodes or fallback to single node
  const nodes = learningMap ? elkNodes : singleNodes;
  const edges = learningMap ? elkEdges : [];

  // Default edge options
  const defaultEdgeOptions = {
    type: "smoothstep" as const,
    animated: true,
  };

  const handleNodeClick = useCallback(
    (event: any, node: any) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // Show loading state while layouting
  if (isLayouting) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg">Calculating optimal layout...</p>
      </div>
    );
  }

  // Show error state if ELK layout failed
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

export default PersonalLearningMapFlow;
