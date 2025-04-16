import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  useReactFlow,
  useNodesInitialized,
  NodeChange,
  applyNodeChanges,
  useStore,
} from "@xyflow/react";
import ConversationNode from "./react-flow/conversation-node";
import QuestionNode from "./react-flow/question-node";
import {
  SerializedArticle,
  SerializedLearningMap,
  SerializedQuestion,
} from "@/types/serialized";
import { Logger } from "@/lib/logger";
import { calculateElkLayout } from "@/lib/elk-layouts";
import type { ElkNode } from "elkjs";

const log = new Logger({ context: "PersonalLearningMapFlow" });

interface PersonalLearningMapFlowProps {
  activeArticleId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  learningMap?: SerializedLearningMap | null;
  layoutDirection?: "UP" | "DOWN" | "LEFT" | "RIGHT";
}

const nodeTypes = {
  conversationNode: ConversationNode,
  questionNode: QuestionNode,
};

type ConversationNodeData = {
  id: string;
  content: {
    summary?: string;
    takeaways?: string[];
  };
  isUser: boolean;
  isLoading: boolean;
  onClick?: () => void;
};

type QuestionNodeData = {
  id: string;
  text: string;
  onClick?: () => void;
};

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  activeArticleId,
  onNodeClick,
  learningMap,
  layoutDirection = "DOWN",
}) => {
  const flow = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const allNodesMeasured = useStore((s) =>
    s.nodes.every((n) => n.measured?.width && n.measured?.height)
  );

  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const nodeSizeKey = useStore(
    useCallback(
      (s) =>
        s.nodes
          .map(
            (n) =>
              `${n.id}:${n.measured?.width ?? 0}x${n.measured?.height ?? 0}`
          )
          .join("|"),
      []
    )
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    log.debug("Recalculating initial nodes and edges based on props.");
    const nodes: Node<ConversationNodeData | QuestionNodeData>[] = [];
    const edges: Edge[] = [];
    const nodeIds = new Set<string>();

    if (learningMap?.articles && learningMap?.questions) {
      learningMap.articles.forEach((article: SerializedArticle) => {
        if (nodeIds.has(article.id)) return;
        const hasValidMetadata = !!(
          article.summary && article.takeaways?.length > 0
        );
        nodes.push({
          id: article.id,
          type: "conversationNode",
          position: { x: 0, y: 0 },
          data: {
            id: article.id,
            content: {
              summary: article.summary,
              takeaways: article.takeaways,
            },
            isUser: false,
            isLoading: !hasValidMetadata,
            onClick: () => onNodeClick?.(article.id),
          },
        });
        nodeIds.add(article.id);
      });

      const articleIdMap = new Map(
        learningMap.articles.map((a) => [a.id, true])
      );
      learningMap.questions.forEach((question: SerializedQuestion) => {
        if (nodeIds.has(question.id)) return;
        if (
          !articleIdMap.has(question.parentArticleId) ||
          !articleIdMap.has(question.childArticleId)
        ) {
          log.warn(
            `Skipping question ${question.id} due to missing parent/child article.`
          );
          return;
        }

        nodes.push({
          id: question.id,
          type: "questionNode",
          position: { x: 0, y: 0 },
          data: {
            id: question.id,
            text: question.text,
            onClick: () => onNodeClick?.(question.id),
          },
        });
        nodeIds.add(question.id);

        edges.push({
          id: `e-${question.parentArticleId}-${question.id}`,
          source: question.parentArticleId,
          target: question.id,
          type: "smoothstep",
          animated: true,
        });

        edges.push({
          id: `e-${question.id}-${question.childArticleId}`,
          source: question.id,
          target: question.childArticleId,
          type: "smoothstep",
          animated: true,
        });
      });
    } else if (activeArticleId && learningMap?.articles) {
      // Fallback: if only activeArticleId and articles are present, add just that node
      const article = learningMap.articles.find(
        (a) => a.id === activeArticleId
      );
      if (article) {
        const hasValidMetadata = !!(
          article.summary && article.takeaways?.length > 0
        );
        nodes.push({
          id: article.id,
          type: "conversationNode",
          position: { x: 0, y: 0 },
          data: {
            id: article.id,
            content: {
              summary: article.summary,
              takeaways: article.takeaways,
            },
            isUser: false,
            isLoading: !hasValidMetadata,
            onClick: () => onNodeClick?.(article.id),
          },
        });
        nodeIds.add(article.id);
      }
    }

    const finalEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return { initialNodes: nodes, initialEdges: finalEdges };
  }, [learningMap, onNodeClick]);

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<ConversationNodeData | QuestionNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodesWithActive = useMemo(() => {
    if (!activeArticleId) return nodes;
    return nodes.map((node) =>
      node.id === activeArticleId
        ? { ...node, data: { ...node.data, isActive: true } }
        : { ...node, data: { ...node.data, isActive: false } }
    );
  }, [nodes, activeArticleId]);

  useEffect(() => {
    log.debug(
      "Initial nodes/edges changed, updating React Flow state.",
      initialNodes,
      initialEdges
    );
    setNodes(initialNodes as Node<ConversationNodeData | QuestionNodeData>[]);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (
      nodesInitialized &&
      allNodesMeasured &&
      nodes.length > 0 &&
      !isLayouting
    ) {
      setIsLayouting(true);
      setLayoutError(null);

      const measuredNodes = flow.getNodes();
      calculateElkLayout(measuredNodes, initialEdges, {
        direction: layoutDirection,
      })
        .then((layoutedGraph: ElkNode) => {
          log.info("ELK layout calculation successful. Applying positions...");

          const elkNodeMap = new Map(
            layoutedGraph.children?.map((elkNode) => [elkNode.id, elkNode])
          );

          const newNodes: Node<ConversationNodeData | QuestionNodeData>[] =
            measuredNodes.map((node) => {
              const elkNode = elkNodeMap.get(node.id);
              if (
                elkNode &&
                elkNode.x !== undefined &&
                elkNode.y !== undefined
              ) {
                return {
                  ...(node as Node<ConversationNodeData | QuestionNodeData>),
                  position: { x: elkNode.x, y: elkNode.y },
                };
              } else {
                log.warn(
                  `No layout position found for node ${node.id}. Keeping original position.`
                );
                return node as Node<ConversationNodeData | QuestionNodeData>;
              }
            });

          log.debug(`Applying ${newNodes.length} new node positions.`);
          setNodes(newNodes);
        })
        .catch((e) => {
          const errorMessage =
            e instanceof Error ? e.message : "Unknown layout error";
          log.error("Layout calculation failed:", e);
          setLayoutError(`Layout failed: ${errorMessage}`);
        })
        .finally(() => setIsLayouting(false));
    }
  }, [
    nodesInitialized,
    allNodesMeasured,
    nodeSizeKey,
    layoutDirection,
    flow,
    initialEdges,
    nodes.length,
    setNodes,
  ]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {},
    []
  );

  return (
    <div className="w-full h-full">
      {isLayouting && (
        <div className="absolute top-2 left-2 z-10 p-2 bg-yellow-200 text-yellow-800 rounded text-xs animate-pulse">
          Calculating layout...
        </div>
      )}
      {layoutError && (
        <div className="absolute top-2 left-2 z-10 p-2 bg-red-200 text-red-800 rounded text-xs">
          Layout Error: {layoutError}
        </div>
      )}

      <ReactFlow
        nodes={nodesWithActive}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={!isLayouting}
        nodesConnectable={!isLayouting}
        elementsSelectable={!isLayouting}
      >
        <Background color="#f0f0f0" gap={24} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default PersonalLearningMapFlow;
