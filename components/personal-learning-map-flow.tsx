import React, { useCallback } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
} from "@xyflow/react";
import ArticleNode from "./react-flow/article-node";
import QuestionNode from "./react-flow/question-node";

// Placeholder component for personal learning map visualization
// This will be replaced with a proper implementation later
interface PersonalLearningMapFlowProps {
  nodes: any[];
  edges: any[];
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = {
  articleNode: ArticleNode,
  questionNode: QuestionNode,
};

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  nodes,
  edges,
  onNodeClick,
}) => {
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
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default PersonalLearningMapFlow;
