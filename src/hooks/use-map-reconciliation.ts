import { useEffect } from "react";
import type { LearningMapHandle } from "@/components/learning-map";
import type { MapNode } from "@/components/learning-map/types";
import { Logger } from "@/lib/logger";
import type { SerializedLearningMap } from "@/types/serialized";

const logger = new Logger({ context: "MapReconciliation", enabled: false });

function convertLearningMapToNodes(learningMap: SerializedLearningMap): {
  nodes: MapNode[];
  edges: any[];
} {
  const nodes: MapNode[] = [];
  const edges: any[] = [];

  // Convert articles to article nodes
  if (learningMap.articles) {
    learningMap.articles.forEach((article, index) => {
      nodes.push({
        id: article.id,
        type: "articleNode",
        position: { x: 0, y: index * 200 },
        data: {
          id: article.id,
          content: {
            summary: article.summary,
            takeaways: article.takeaways,
          },
          isUser: false,
          isRoot: article.isRoot,
        },
        style: {
          opacity: 0,
          pointerEvents: "none" as const,
        },
      });
    });
  }

  // Convert questions to question nodes and create edges
  if (learningMap.questions) {
    learningMap.questions.forEach((question, index) => {
      nodes.push({
        id: question.id,
        type: "questionNode",
        position: { x: 300, y: index * 200 },
        data: {
          id: question.id,
          text: question.text,
        },
        style: {
          opacity: 0,
          pointerEvents: "none" as const,
        },
      });

      edges.push({
        id: `${question.parentArticleId}-${question.id}`,
        source: question.parentArticleId,
        target: question.id,
        type: "smoothstep",
        animated: false,
        style: {
          opacity: 0,
        },
      });

      edges.push({
        id: `${question.id}-${question.childArticleId}`,
        source: question.id,
        target: question.childArticleId,
        type: "smoothstep",
        animated: false,
        style: {
          opacity: 0,
        },
      });
    });
  }

  return { nodes, edges };
}

function _findSourceNodeId(node: MapNode, learningMap: SerializedLearningMap): string | undefined {
  if (node.type === "questionNode") {
    const question = learningMap.questions?.find((q) => q.id === node.id);
    return question?.parentArticleId;
  }

  if (node.type === "articleNode") {
    // Find the question that has this article as its childArticleId
    const parentQuestion = learningMap.questions?.find((q) => q.childArticleId === node.id);
    return parentQuestion?.id;
  }

  return undefined;
}

export function useMapReconciliation(
  learningMap: SerializedLearningMap | null,
  mapRef: React.Ref<LearningMapHandle>
) {
  useEffect(() => {
    if (!learningMap) {
      logger.info("No learning map provided, skipping reconciliation");
      return;
    }

    if (!mapRef || !("current" in mapRef)) {
      throw new Error("useMapReconciliation requires a React.RefObject");
    }

    if (!mapRef.current) {
      logger.info("Map ref not ready, skipping reconciliation");
      return;
    }

    logger.info("Starting reconciliation", {
      learningMapId: learningMap.id,
      learningMapUpdatedAt: learningMap.updatedAt,
      articleCount: learningMap.articles?.length || 0,
      questionCount: learningMap.questions?.length || 0,
    });

    const currentNodes = mapRef.current.getNodes();
    const { nodes: desiredNodes } = convertLearningMapToNodes(learningMap);

    logger.debug("Node comparison", {
      currentNodeCount: currentNodes.length,
      desiredNodeCount: desiredNodes.length,
      currentNodeIds: currentNodes.map((n) => n.id),
      desiredNodeIds: desiredNodes.map((n) => n.id),
    });

    // Find new nodes
    const newNodes = desiredNodes.filter(
      (desired) => !currentNodes.find((current) => current.id === desired.id)
    );

    // Find updated nodes
    const updatedNodes = desiredNodes.filter((desired) => {
      const current = currentNodes.find((c) => c.id === desired.id);
      if (!current) return false;

      const currentData = JSON.stringify(current.data);
      const desiredData = JSON.stringify(desired.data);
      const hasChanged = currentData !== desiredData;

      if (hasChanged) {
        logger.info("Node update detected", {
          nodeId: desired.id,
          currentSummary: `${current.data?.content?.summary?.substring(0, 50)}...`,
          desiredSummary: `${desired.data?.content?.summary?.substring(0, 50)}...`,
          currentTakeawaysCount: current.data?.content?.takeaways?.length || 0,
          desiredTakeawaysCount: desired.data?.content?.takeaways?.length || 0,
        });
      }

      return hasChanged;
    });

    if (newNodes.length > 0) {
      logger.info("Adding new nodes", {
        count: newNodes.length,
        nodeIds: newNodes.map((n) => n.id),
        nodeTypes: newNodes.map((n) => n.type),
      });
    }

    if (updatedNodes.length > 0) {
      logger.info("Updating existing nodes", {
        count: updatedNodes.length,
        nodeIds: updatedNodes.map((n) => n.id),
      });
    }

    if (newNodes.length === 0 && updatedNodes.length === 0) {
      logger.debug("No changes detected, skipping node operations");
      return;
    }

    // Add new nodes using functional update chain approach
    if (newNodes.length > 0) {
      logger.info("Calling addDependentNodesChain", {
        newNodesCount: newNodes.length,
        newNodes: JSON.stringify(newNodes.map((n) => ({ id: n.id, type: n.type, data: n.data }))),
        learningMapQuestions: JSON.stringify(learningMap.questions),
        learningMapArticles: JSON.stringify(learningMap.articles),
      });
      mapRef.current?.addDependentNodesChain(newNodes, learningMap);
    }

    // Update existing nodes
    updatedNodes.forEach((node) => {
      logger.debug("Updating node", {
        nodeId: node.id,
        nodeType: node.type,
        hasSummary: !!node.data?.content?.summary,
      });

      mapRef.current?.replaceNode({
        id: node.id,
        newNode: node,
      });
    });

    logger.info("Reconciliation complete", {
      newNodesAdded: newNodes.length,
      nodesUpdated: updatedNodes.length,
    });
  }, [learningMap, mapRef]);
}
