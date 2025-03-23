import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
  activeArticleAtom,
  activeArticleIdAtom,
  addArticleAtom,
  addQuestionAtom,
  articlesAtom,
  flowEdgesAtom,
  flowNeedsUpdateAtom,
  flowNodesAtom,
  hasArticlesAtom,
  initializeLearningMapAtom,
  isGeneratingArticleAtom,
  isStreamingContentAtom,
  learningMapIdAtom,
  mapViewportAtom,
  questionContextAtom,
  questionsAtom,
  rootArticleAtom,
  rootArticleIdAtom,
  saveNodePositionsAtom,
  selectNodeAtom,
  updateArticleAtom,
  updateFlowAtom,
} from "@/state/learning-map-state";
import type {
  SerializedArticle,
  SerializedLearningMap,
  SerializedQuestion,
} from "@/types/serialized";
import type { Node, Edge, Viewport } from "@xyflow/react";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "useLearningMapState", enabled: true });

/**
 * Custom hook for managing learning map state via Jotai
 */
export function useLearningMapState() {
  // Core atoms
  const [learningMapId, setLearningMapId] = useAtom(learningMapIdAtom);
  const [activeArticleId, setActiveArticleId] = useAtom(activeArticleIdAtom);
  const [questionContext, setQuestionContext] = useAtom(questionContextAtom);

  // Data atoms
  const articles = useAtomValue(articlesAtom);
  const questions = useAtomValue(questionsAtom);

  // Flow state
  const [flowNodes, setFlowNodes] = useAtom(flowNodesAtom);
  const [flowEdges, setFlowEdges] = useAtom(flowEdgesAtom);
  const [flowNeedsUpdate, setFlowNeedsUpdate] = useAtom(flowNeedsUpdateAtom);

  // Derived atoms
  const activeArticle = useAtomValue(activeArticleAtom);
  const rootArticle = useAtomValue(rootArticleAtom);
  const hasArticles = useAtomValue(hasArticlesAtom);

  // UI state
  const [viewport, setViewport] = useAtom(mapViewportAtom);

  // Control states
  const [isGeneratingArticle, setIsGeneratingArticle] = useAtom(
    isGeneratingArticleAtom
  );
  const [isStreamingContent, setIsStreamingContent] = useAtom(
    isStreamingContentAtom
  );

  // Action setters
  const initializeLearningMap = useSetAtom(initializeLearningMapAtom);
  const addArticle = useSetAtom(addArticleAtom);
  const updateArticle = useSetAtom(updateArticleAtom);
  const addQuestion = useSetAtom(addQuestionAtom);
  const updateFlow = useSetAtom(updateFlowAtom);
  const saveNodePositions = useSetAtom(saveNodePositionsAtom);
  const selectNode = useSetAtom(selectNodeAtom);

  // Composite actions
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      logger.info("Node clicked", { nodeId });
      selectNode(nodeId);
    },
    [selectNode]
  );

  const handleViewportChange = useCallback(
    (newViewport: Viewport) => {
      setViewport(newViewport);
    },
    [setViewport]
  );

  const updateFlowVisualization = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      updateFlow({ nodes, edges });
    },
    [updateFlow]
  );

  return {
    // Core state
    learningMapId,
    activeArticleId,
    activeArticle,
    rootArticle,
    questionContext,

    // Data
    articles,
    questions,
    hasArticles,

    // Flow state
    flowNodes,
    flowEdges,
    flowNeedsUpdate,
    viewport,

    // Control states
    isGeneratingArticle,
    isStreamingContent,

    // Actions
    setLearningMapId,
    setActiveArticleId,
    setQuestionContext,
    initializeLearningMap,
    addArticle,
    updateArticle,
    addQuestion,
    updateFlowVisualization,
    saveNodePositions,
    selectNode,
    setIsGeneratingArticle,
    setIsStreamingContent,

    // Handlers
    handleNodeClick,
    handleViewportChange,
  };
}
