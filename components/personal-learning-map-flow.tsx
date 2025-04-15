import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
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
} from "@xyflow/react";
import ConversationNode from "./react-flow/conversation-node";
import QuestionNode from "./react-flow/question-node";
import {
  SerializedLearningMap,
  SerializedQuestion,
  SerializedArticle,
} from "@/types/serialized";
import { Logger } from "@/lib/logger";
import { calculateElkLayout } from "@/lib/elk-layouts";
import type { ElkNode } from "elkjs";

const log = new Logger({ context: "PersonalLearningMapFlow" });

interface PersonalLearningMapFlowProps {
  onNodeClick?: (nodeId: string) => void;
  learningMap?: SerializedLearningMap | null;
  layoutDirection?: "UP" | "DOWN" | "LEFT" | "RIGHT";
  activeNodeId?: string | null;
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

// Define the type for the ref's value explicitly
interface PrevDeps {
  initialNodes: Node<ConversationNodeData | QuestionNodeData>[];
  initialEdges: Edge[];
  nodesLength: number;
  layoutDirection: "UP" | "DOWN" | "LEFT" | "RIGHT";
  nodesInitialized: boolean;
  isLayouting: boolean;
  layoutAttempted: boolean;
}

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  onNodeClick,
  learningMap,
  layoutDirection = "DOWN",
  activeNodeId = null,
}) => {
  const flow = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutAttempted, setLayoutAttempted] = useState(false);

  // Initialize the ref with the correct type and default values
  const prevDeps = useRef<PrevDeps>({
    initialNodes: [], // Now correctly typed
    initialEdges: [], // Now correctly typed
    nodesLength: 0,
    layoutDirection,
    nodesInitialized: false, // Use appropriate default
    isLayouting: false,
    layoutAttempted: false,
  });

  const { initialNodes, initialEdges } = useMemo(() => {
    log.debug("Running useMemo to generate initial nodes/edges.");
    setLayoutAttempted(false);
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
    }

    const finalEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    if (nodes.length > 0) {
      return { initialNodes: nodes, initialEdges: finalEdges };
    } else {
      log.debug("No valid learningMap data, returning empty nodes/edges.");
      return { initialNodes: [], initialEdges: [] };
    }
  }, [
    learningMap?.id,
    learningMap?.articles?.length,
    learningMap?.questions?.length,
    onNodeClick,
  ]);

  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<ConversationNodeData | QuestionNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    log.debug(
      "Initial nodes/edges changed (from useMemo), updating React Flow state.",
      initialNodes.length,
      initialEdges.length
    );
    setNodes(initialNodes as Node<ConversationNodeData | QuestionNodeData>[]);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    const changedDeps: string[] = [];
    if (prevDeps.current.initialNodes !== initialNodes)
      changedDeps.push("initialNodes");
    if (prevDeps.current.initialEdges !== initialEdges)
      changedDeps.push("initialEdges");
    if (prevDeps.current.nodesLength !== nodes.length)
      changedDeps.push(
        `nodes.length (${prevDeps.current.nodesLength} -> ${nodes.length})`
      );
    if (prevDeps.current.layoutDirection !== layoutDirection)
      changedDeps.push("layoutDirection");
    if (prevDeps.current.nodesInitialized !== nodesInitialized)
      changedDeps.push(
        `nodesInitialized (${prevDeps.current.nodesInitialized} -> ${nodesInitialized})`
      );
    if (prevDeps.current.isLayouting !== isLayouting)
      changedDeps.push(
        `isLayouting (${prevDeps.current.isLayouting} -> ${isLayouting})`
      );
    if (prevDeps.current.layoutAttempted !== layoutAttempted)
      changedDeps.push(
        `layoutAttempted (${prevDeps.current.layoutAttempted} -> ${layoutAttempted})`
      );

    if (changedDeps.length > 0) {
      log.debug(
        `Layout effect triggered. Changed dependencies: ${changedDeps.join(", ")}`
      );
    } else {
      log.debug(
        "Layout effect triggered. No dependency changes detected (could be initial run or ref issue)."
      );
    }

    if (
      nodesInitialized &&
      initialNodes.length > 0 &&
      nodes.length > 0 &&
      !isLayouting &&
      !layoutAttempted
    ) {
      log.info("Conditions met. Attempting layout calculation...");
      setIsLayouting(true);
      setLayoutAttempted(true);
      setLayoutError(null);

      const measuredNodes = flow.getNodes();

      if (measuredNodes.length === 0) {
        log.warn("Attempted layout with zero measured nodes. Aborting.");
        setIsLayouting(false);
        return;
      }
      const nodesWithDimensions = measuredNodes.filter(
        (n) => n.measured?.width && n.measured?.height
      );
      if (nodesWithDimensions.length !== measuredNodes.length) {
        log.warn(
          `Measured dimensions missing for ${measuredNodes.length - nodesWithDimensions.length} nodes. Proceeding with available data.`
        );
      }

      log.debug(
        `Calling calculateElkLayout with ${measuredNodes.length} nodes and ${initialEdges.length} edges.`
      );

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

          setTimeout(() => {
            log.debug("Calling fitView after applying layout.");
            flow.fitView({ padding: 0.2, duration: 300 });
          }, 0);
        })
        .catch((e) => {
          const errorMessage =
            e instanceof Error ? e.message : "Unknown layout error";
          log.error("Layout calculation failed:", e);
          setLayoutError(`Layout failed: ${errorMessage}`);
        })
        .finally(() => {
          log.debug("Layout calculation process finished.");
          setIsLayouting(false);
        });
    } else if (!layoutAttempted && initialNodes.length > 0) {
      log.debug("Layout conditions not yet met.", {
        nodesInitialized,
        initialNodeCount: initialNodes.length,
        currentNodeCount: nodes.length,
        isLayouting,
        layoutAttempted,
      });
    }

    // This assignment should now be type-correct
    prevDeps.current = {
      initialNodes,
      initialEdges,
      nodesLength: nodes.length,
      layoutDirection,
      nodesInitialized,
      isLayouting,
      layoutAttempted,
    };
  }, [
    nodesInitialized,
    initialNodes,
    initialEdges,
    nodes.length,
    flow,
    isLayouting,
    layoutAttempted,
    layoutDirection,
    setNodes,
  ]);

  useEffect(() => {
    log.debug(
      `Active node ID changed to: ${activeNodeId}. Updating selection.`
    );
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        selected: node.id === activeNodeId,
      }))
    );
  }, [activeNodeId, setNodes, flow]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        log.debug(`Node ${node.id} clicked, calling onNodeClick prop.`);
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
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
        nodes={nodes}
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
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background color="#f0f0f0" gap={24} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default PersonalLearningMapFlow;
