import React, { useCallback } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
} from "@xyflow/react";
import ConversationNode from "./react-flow/conversation-node";
import { SerializedArticle } from "@/types/serialized";

interface PersonalLearningMapFlowProps {
  rootArticle?: SerializedArticle | null;
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = {
  conversationNode: ConversationNode,
};

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  rootArticle,
  onNodeClick,
}) => {
  const summary = rootArticle?.summary || "";
  const takeaways = rootArticle?.takeaways || [];

  const hasValidMetadata = !!(summary && takeaways.length > 0);

  // Create a single node for the root article
  const nodes = rootArticle
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

  // No edges for a single node
  const edges = [];

  const handleNodeClick = useCallback(
    (event: any, node: any) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default PersonalLearningMapFlow;
