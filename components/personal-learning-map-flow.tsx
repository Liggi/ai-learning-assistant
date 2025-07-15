import React, { useCallback, useMemo } from "react";
import LearningMap from "./learning-map";
import ArticleNode from "./learning-map/article-node";
import QuestionNode from "./learning-map/question-node";
import { SerializedLearningMap } from "@/types/serialized";
import type { MapNode, MapEdge } from "./learning-map/types";
import type { SerializedArticle, SerializedQuestion } from "@/types/serialized";

interface PersonalLearningMapFlowProps {
  onNodeClick?: (nodeId: string) => void;
  learningMap?: SerializedLearningMap | null;
}

const nodeTypes = {
  articleNode: ArticleNode,
  questionNode: QuestionNode,
};

// Convert SerializedLearningMap to our MapNode/MapEdge format
function convertLearningMapToNodes(learningMap: SerializedLearningMap): {
  nodes: MapNode[];
  edges: MapEdge[];
} {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];

  // Convert articles to article nodes
  if (learningMap.articles) {
    learningMap.articles.forEach((article, index) => {
      nodes.push({
        id: article.id,
        type: "articleNode",
        position: { x: 0, y: index * 200 }, // Temporary positions, layout will fix
        data: {
          id: article.id,
          content: {
            summary: article.summary,
            takeaways: article.takeaways,
          },
          isUser: false,
          isRoot: article.isRoot,
        },
      });
    });
  }

  // Convert questions to question nodes and create edges
  if (learningMap.questions) {
    learningMap.questions.forEach((question, index) => {
      // Create question node
      nodes.push({
        id: question.id,
        type: "questionNode",
        position: { x: 300, y: index * 200 }, // Temporary positions
        data: {
          id: question.id,
          text: question.text,
        },
      });

      // Create edges: parent article -> question -> child article
      edges.push({
        id: `${question.parentArticleId}-${question.id}`,
        source: question.parentArticleId,
        target: question.id,
        type: "smoothstep",
        animated: false,
      });

      edges.push({
        id: `${question.id}-${question.childArticleId}`,
        source: question.id,
        target: question.childArticleId,
        type: "smoothstep",
        animated: false,
      });
    });
  }

  return { nodes, edges };
}

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  onNodeClick,
  learningMap,
}) => {
  const { nodes, edges } = useMemo(() => {
    if (!learningMap) {
      return { nodes: [], edges: [] };
    }
    return convertLearningMapToNodes(learningMap);
  }, [learningMap]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    },
    [onNodeClick]
  );

  return (
    <div className="w-full h-full">
      <LearningMap
        defaultNodes={nodes}
        defaultEdges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        className="w-full h-full"
      />
    </div>
  );
};

export default React.memo(PersonalLearningMapFlow);
