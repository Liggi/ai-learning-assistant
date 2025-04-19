import { useMemo } from "react";
import { Node as ReactFlowNode, Edge } from "@xyflow/react";
import { SerializedLearningMap } from "@/types/serialized";
import { useLearningMapTree } from "./use-learning-map-tree";
import type { TreeArticleNode } from "./use-learning-map-tree";
import { useElkLayout } from "./use-elk-layout";

interface ArticleNodeData {
  nodeType: "article";
  label: string;
  description: string | null;
  status?: "completed" | "in-progress" | "not-started";
  progress?: number;
  [key: string]: unknown;
}

interface ConversationNodeData {
  id: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  isLoading?: boolean;
  [key: string]: unknown;
}

interface QuestionNodeData {
  nodeType: "question";
  id: string;
  text: string;
  isImplicit: boolean;
  [key: string]: unknown;
}

type LearningMapFlowNode = ReactFlowNode<
  ArticleNodeData | QuestionNodeData | ConversationNodeData
>;

interface ReactFlowLayout {
  nodes: LearningMapFlowNode[];
  edges: Edge[];
}

const initialPosition = { x: 0, y: 0 }; // ELK will calculate final positions

/**
 * Converts the learning map tree structure into React Flow nodes and edges.
 */
export function useReactFlowLayout(
  rootNode: TreeArticleNode | null
): ReactFlowLayout {
  return useMemo(() => {
    if (!rootNode) {
      return { nodes: [], edges: [] };
    }

    const nodes: LearningMapFlowNode[] = [];
    const edges: Edge[] = [];
    const visited = new Set<string>(); // Prevents cycles

    const traverse = (articleNode: TreeArticleNode) => {
      if (visited.has(articleNode.id)) {
        return;
      }
      visited.add(articleNode.id);

      const articleFlowNodeId = `article-${articleNode.id}`;
      nodes.push({
        id: articleFlowNodeId,
        type: "conversationNode",
        position: initialPosition,
        data: {
          id: articleNode.id,
          content: {
            summary: articleNode.data.summary || "",
            takeaways: articleNode.data.takeaways || [],
          },
          isUser: false,
          isLoading: false,
        },
      });

      // Process outgoing questions and child articles
      articleNode.outgoingQuestions.forEach((questionNode) => {
        const questionFlowNodeId = `question-${questionNode.id}`;
        nodes.push({
          id: questionFlowNodeId,
          type: "questionNode",
          position: initialPosition,
          data: {
            nodeType: "question",
            id: questionNode.id,
            text: questionNode.data.text,
            isImplicit: false,
          },
        });

        // Article -> Question edge
        edges.push({
          id: `e-${articleFlowNodeId}-${questionFlowNodeId}`,
          source: articleFlowNodeId,
          target: questionFlowNodeId,
          animated: true,
        });

        if (questionNode.childArticle) {
          // Child Article Node (prefix id)
          const childArticleFlowNodeId = `article-${questionNode.childArticle.id}`;

          // Question -> Child Article edge
          edges.push({
            id: `e-${questionFlowNodeId}-${childArticleFlowNodeId}`,
            source: questionFlowNodeId,
            target: childArticleFlowNodeId,
            animated: true,
          });

          traverse(questionNode.childArticle);
        }
      });
    };

    traverse(rootNode);

    return { nodes, edges };
  }, [rootNode]);
}

/**
 * Convenience wrapper that builds the tree structure and converts it to React Flow layout.
 */
export function useLearningMapFlowLayout(
  learningMap: SerializedLearningMap | null | undefined
): ReactFlowLayout {
  const rootNode = useLearningMapTree(learningMap);
  return useReactFlowLayout(rootNode);
}

/**
 * Enhanced learning map layout that automatically positions nodes using the ELK algorithm.
 * Returns the layouted nodes/edges plus loading state for UI feedback.
 */
export function useLearningMapElkLayout(
  learningMap: SerializedLearningMap | null | undefined,
  options?: { direction?: "UP" | "DOWN" | "LEFT" | "RIGHT" }
): {
  nodes: LearningMapFlowNode[];
  edges: Edge[];
  isLayouting: boolean;
  error: string | null;
} {
  // First, get the basic node structure without proper layout
  const { nodes: initialNodes, edges: initialEdges } =
    useLearningMapFlowLayout(learningMap);

  // Then apply the ELK layout algorithm to position the nodes
  return useElkLayout<
    ArticleNodeData | QuestionNodeData | ConversationNodeData,
    Record<string, unknown>
  >(initialNodes, initialEdges, options);
}
