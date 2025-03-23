import React, { useCallback, useEffect, useState } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  OnMove,
  Node,
  Edge,
  NodeProps,
  Viewport,
  Panel,
  MiniMap,
  ControlButton,
} from "@xyflow/react";
import {
  Zap,
  Home,
  Maximize,
  Minimize,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import ConversationNode from "./react-flow/conversation-node";
import QuestionNode from "./react-flow/question-node";
import {
  computeForceLayout,
  optimizeGraphForPerformance,
  calculateGraphDensity,
} from "@/utils/force-directed-layout";
import { useLearningMapState } from "@/hooks/use-learning-map-state";
import { Logger } from "@/lib/logger";
import { motion, AnimatePresence } from "framer-motion";
import { PerformanceMonitor } from "./ui/performance-monitor";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { SerializedArticle, SerializedQuestion } from "@/types/serialized";

const logger = new Logger({
  context: "PersonalLearningMapFlow",
  enabled: true,
});

// Node types for ReactFlow
const nodeTypes = {
  conversationNode: ConversationNode,
  questionNode: QuestionNode,
};

/**
 * The main flow visualization component.
 * This is a wrapper that provides the ReactFlowProvider context.
 */
const PersonalLearningMapFlow: React.FC = () => {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <FlowVisualization />
      </ReactFlowProvider>
    </div>
  );
};

/**
 * The inner component that contains the actual flow visualization.
 * This is separated to use the useReactFlow hook which must be used inside a ReactFlowProvider.
 */
const FlowVisualization: React.FC = () => {
  const reactFlow = useReactFlow();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoLayout, setIsAutoLayout] = useState(false);
  const createArticleMutation = useCreateArticleFromQuestion();

  const {
    // Core data
    articles,
    questions,
    activeArticleId,

    // Flow state
    flowNodes,
    flowEdges,
    flowNeedsUpdate,
    viewport,

    // Actions
    updateFlowVisualization,
    saveNodePositions,
    handleNodeClick,
    handleViewportChange,
  } = useLearningMapState();

  // Calculate layout whenever articles or questions change
  useEffect(() => {
    if (flowNeedsUpdate && articles.length > 0) {
      logger.info("Calculating flow layout", {
        articleCount: articles.length,
        questionCount: questions.length,
        activeArticleId,
      });

      try {
        const { nodes, edges } = computeForceLayout(articles, questions, {
          activeArticleId: activeArticleId || undefined,
        });

        // Type safety: ensure the nodes match the ReactFlow Node type
        const typedNodes = nodes as unknown as Node[];
        const typedEdges = edges as Edge[];

        // Ensure all connections are included
        const completeEdges = ensureAllEdges(articles, questions, typedEdges);

        updateFlowVisualization(typedNodes, completeEdges);

        // Fit view to show all nodes after a short delay
        setTimeout(() => {
          reactFlow.fitView({ padding: 0.2 });
        }, 100);
      } catch (error) {
        logger.error("Error calculating layout", { error });
      }
    }
  }, [
    articles,
    questions,
    activeArticleId,
    flowNeedsUpdate,
    updateFlowVisualization,
    reactFlow,
  ]);

  // Zoom to active node when it changes
  useEffect(() => {
    if (activeArticleId && flowNodes.length > 0) {
      // Find the active node
      const activeNode = flowNodes.find((node) => node.id === activeArticleId);

      if (activeNode) {
        // Animate to the node's position with a slight zoom
        reactFlow.setViewport(
          {
            x: -activeNode.position.x * viewport.zoom + window.innerWidth / 3,
            y: -activeNode.position.y * viewport.zoom + window.innerHeight / 3,
            zoom: viewport.zoom,
          },
          { duration: 800 }
        );
      }
    }
  }, [activeArticleId, flowNodes, reactFlow, viewport.zoom]);

  // Save node positions on node drag end
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const allNodes = reactFlow.getNodes();

      // Create a map of node positions
      const nodePositions: Record<string, { x: number; y: number }> = {};

      allNodes.forEach((n) => {
        nodePositions[n.id] = { x: n.position.x, y: n.position.y };
      });

      // Disable auto-layout when a user manually positions nodes
      setIsAutoLayout(false);

      // Save positions to state (which will update the data model)
      saveNodePositions(nodePositions);
    },
    [reactFlow, saveNodePositions]
  );

  // Handle node click with question handling
  const onNodeClick = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      // First check if it's a question without a destination article
      const question = questions.find(
        (q) => q.id === node.id && !q.destinationArticleId
      );

      if (question) {
        try {
          logger.info("Creating new article from question", {
            questionId: node.id,
          });
          // Create a new article from the question
          const newArticle = await createArticleMutation.mutateAsync({
            questionId: node.id,
          });

          logger.info("New article created", {
            articleId: newArticle.id,
            questionId: node.id,
          });

          // Set as active article
          handleNodeClick(newArticle.id);
        } catch (error) {
          logger.error("Failed to create article from question", { error });
        }
      } else {
        // Regular node click handling
        handleNodeClick(node.id);
      }
    },
    [handleNodeClick, createArticleMutation, questions]
  );

  // Handle viewport change
  const onMoveEnd = useCallback(
    (event: any) => {
      if (event && event.viewport) {
        const newViewport: Viewport = {
          x: event.viewport.x,
          y: event.viewport.y,
          zoom: event.viewport.zoom,
        };
        handleViewportChange(newViewport);
      }
    },
    [handleViewportChange]
  );

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    const element = document.documentElement;
    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Toggle auto-layout
  const toggleAutoLayout = useCallback(() => {
    setIsAutoLayout((prev) => {
      const newValue = !prev;

      // If turning on auto-layout, recalculate the layout immediately
      if (newValue && articles.length > 0) {
        try {
          const { nodes, edges } = computeForceLayout(articles, questions, {
            activeArticleId: activeArticleId || undefined,
            // Use more iterations for a cleaner layout
            iterations: 500,
          });

          // Type safety: ensure the nodes match the ReactFlow Node type
          const typedNodes = nodes as Node[];
          const typedEdges = edges as Edge[];

          updateFlowVisualization(typedNodes, typedEdges);

          // Fit view to show all nodes after a short delay
          setTimeout(() => {
            reactFlow.fitView({ padding: 0.2 });
          }, 100);
        } catch (error) {
          logger.error("Error calculating layout", { error });
        }
      }

      return newValue;
    });
  }, [
    activeArticleId,
    articles,
    questions,
    reactFlow,
    updateFlowVisualization,
  ]);

  // Go to root node
  const goToRootNode = useCallback(() => {
    const rootNode = flowNodes.find((node) =>
      articles.find((a) => a.id === node.id && a.isRoot)
    );

    if (rootNode) {
      handleNodeClick(rootNode.id);
    }
  }, [articles, flowNodes, handleNodeClick]);

  // Update edge styles to highlight active connections
  const styledEdges = flowEdges.map((edge) => {
    const isActiveConnection =
      edge.source === activeArticleId || edge.target === activeArticleId;

    return {
      ...edge,
      animated: isActiveConnection,
      style: {
        stroke: isActiveConnection ? "#3b82f6" : "#4b5563",
        strokeWidth: isActiveConnection ? 2 : 1,
      },
    };
  });

  // Apply performance optimizations for larger graphs
  const [optimizedGraph, setOptimizedGraph] = useState<{
    nodes: Node[];
    edges: Edge[];
  }>({ nodes: [], edges: [] });

  const [screenDimensions, setScreenDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1000,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  // Update screen dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Apply performance optimizations for larger graphs
  useEffect(() => {
    // Only optimize if we have enough nodes for it to matter
    if (flowNodes.length > 0) {
      const { nodes, edges } = optimizeGraphForPerformance(
        flowNodes,
        styledEdges,
        activeArticleId,
        viewport,
        screenDimensions
      );

      // Only update if number of visible nodes/edges changed to prevent unnecessary rerenders
      if (
        nodes.length !== optimizedGraph.nodes.length ||
        edges.length !== optimizedGraph.edges.length
      ) {
        setOptimizedGraph({ nodes, edges });
        logger.info("Applied graph optimization", {
          totalNodes: flowNodes.length,
          visibleNodes: nodes.length,
          totalEdges: styledEdges.length,
          visibleEdges: edges.length,
        });
      }
    } else {
      setOptimizedGraph({ nodes: flowNodes, edges: styledEdges });
    }
  }, [flowNodes, styledEdges, activeArticleId, viewport, screenDimensions]);

  // Optimize layout parameters based on graph characteristics
  useEffect(() => {
    if (isAutoLayout && articles.length > 20) {
      const { recommendedLinkDistance, recommendedChargeStrength } =
        calculateGraphDensity(flowNodes, flowEdges);

      logger.info("Calculated optimal layout parameters", {
        recommendedLinkDistance,
        recommendedChargeStrength,
        nodeCount: flowNodes.length,
      });

      // Use these optimized parameters when recalculating layout
      // This could be stored in state and passed to computeForceLayout
    }
  }, [isAutoLayout, articles.length, flowNodes, flowEdges]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={
          optimizedGraph.nodes.length > 0 ? optimizedGraph.nodes : flowNodes
        }
        edges={
          optimizedGraph.edges.length > 0 ? optimizedGraph.edges : styledEdges
        }
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={onMoveEnd}
        defaultViewport={viewport}
        fitView={flowNodes.length > 0}
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#444" gap={16} />

        <Panel position="top-right" className="flex flex-col gap-1">
          <div className="flex gap-1 items-center mb-1">
            <button
              onClick={toggleAutoLayout}
              className={`${
                isAutoLayout
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700/80 text-slate-300"
              } p-2 rounded hover:bg-blue-500 hover:text-white transition-colors`}
              title="Toggle auto-layout"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="bg-slate-700/80 p-2 rounded text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <button
              onClick={goToRootNode}
              className="bg-slate-700/80 p-2 rounded text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
              title="Go to root article"
            >
              <Home size={16} />
            </button>
          </div>

          <MiniMap
            nodeColor={(node) => {
              if (node.id === activeArticleId) return "#3b82f6";
              return node.type === "conversationNode" ? "#10b981" : "#6366f1";
            }}
            maskColor="#1f2937"
            className="rounded bg-slate-800/80 border border-slate-700"
          />
        </Panel>

        <Controls
          showInteractive={false}
          className="bg-slate-800/80 border border-slate-700 rounded-md overflow-hidden"
        >
          <ControlButton onClick={toggleAutoLayout} title="Toggle auto-layout">
            <RefreshCw size={16} />
          </ControlButton>
        </Controls>

        <AnimatePresence>
          {activeArticleId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-md shadow-lg text-xs text-slate-300 flex items-center gap-2"
            >
              <Zap size={14} className="text-blue-400" />
              <span>
                {activeArticleId
                  ? `Viewing ${articles.find((a) => a.id === activeArticleId)?.isRoot ? "root" : ""} article`
                  : "Select an article to view"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <PerformanceMonitor
          nodeCount={optimizedGraph.nodes.length || flowNodes.length}
          edgeCount={optimizedGraph.edges.length || styledEdges.length}
          enabled={flowNodes.length > 20}
        />
      </ReactFlow>
    </div>
  );
};

// Helper to ensure all edges are included
function ensureAllEdges(
  articles: SerializedArticle[],
  questions: SerializedQuestion[],
  existingEdges: Edge[]
): Edge[] {
  const edgeMap = new Map<string, Edge>();

  // Add existing edges to map
  existingEdges.forEach((edge) => {
    edgeMap.set(`${edge.source}-${edge.target}`, edge);
  });

  // Add article-to-question edges
  articles.forEach((article) => {
    article.questions.forEach((question) => {
      const edgeId = `${article.id}-${question.id}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: article.id,
          target: question.id,
          type: "smoothstep",
        });
      }
    });
  });

  // Add question-to-destination-article edges
  questions.forEach((question) => {
    if (question.destinationArticleId) {
      const edgeId = `${question.id}-${question.destinationArticleId}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: question.id,
          target: question.destinationArticleId,
          type: "smoothstep",
        });
      }
    }
  });

  return Array.from(edgeMap.values());
}

export default PersonalLearningMapFlow;
