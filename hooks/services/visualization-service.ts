import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  useLayoutByPersonalLearningMap,
  useUpsertLayout,
} from "@/hooks/api/layouts";
import {
  ArticleNode,
  QuestionEdge,
  LayoutData,
  Article,
  UserQuestion,
} from "@/types/personal-learning-map";
import { Logger } from "@/lib/logger";
import { generateNodeContent } from "@/features/generators/node-content";

// Constants for layout
const VERTICAL_SPACING = 60; // Space between the bottom of one node and top of the next
const HORIZONTAL_SPACING = 400; // Space between columns
const START_X = 100; // Starting X position
const START_Y = 100; // Starting Y position
const DEFAULT_NODE_HEIGHT = 150; // Default height if not measured yet

// Create a logger instance for the visualization service
const logger = new Logger({ context: "VisualizationService" });

// Tree node interface used for computing a tree layout
interface TreeNode {
  article: Article;
  children: TreeNode[];
  position?: { x: number; y: number };
}

/**
 * VisualizationService hook for managing personal learning map visualization
 */
export function useVisualizationService(
  personalLearningMapId: string | null,
  subjectInfo?: {
    subject: string;
    moduleTitle: string;
  }
) {
  // Add dependency array tracking
  const prevDepsRef = useRef<{
    personalLearningMapId: string | null;
    subject?: string;
    moduleTitle?: string;
  }>({
    personalLearningMapId: null,
  });

  // Check what changed to cause a re-render
  const currentDeps = {
    personalLearningMapId,
    subject: subjectInfo?.subject,
    moduleTitle: subjectInfo?.moduleTitle,
  };

  // Log if any dependencies changed
  if (
    prevDepsRef.current.personalLearningMapId !==
      currentDeps.personalLearningMapId ||
    prevDepsRef.current.subject !== currentDeps.subject ||
    prevDepsRef.current.moduleTitle !== currentDeps.moduleTitle
  ) {
    logger.debug("VisualizationService deps changed:", {
      prevDeps: prevDepsRef.current,
      currentDeps,
    });
    prevDepsRef.current = { ...currentDeps };
  }

  // Add logging
  logger.info("Visualization service hook called", {
    personalLearningMapId,
    hasSubjectInfo: !!subjectInfo,
  });

  // State
  const [nodes, setNodes] = useState<ArticleNode[]>([]);
  const [edges, setEdges] = useState<QuestionEdge[]>([]);
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});
  const [nodeContent, setNodeContent] = useState<
    Record<
      string,
      {
        summary: string;
        takeaways?: string[];
      }
    >
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // API hooks
  const { data: savedLayout, isLoading: isLoadingLayout } =
    useLayoutByPersonalLearningMap(personalLearningMapId);
  const { mutateAsync: upsertLayoutAsync } = useUpsertLayout();

  /**
   * Generate content for an article node using LLM
   */
  const generateContent = useCallback(
    async (article: Article) => {
      // Check if we already have content for this node
      if (nodeContent[article.id]) {
        return nodeContent[article.id];
      }

      // Skip if we don't have subject info
      if (!subjectInfo) {
        const fallbackContent = {
          summary:
            article.content.substring(0, 100) +
            (article.content.length > 100 ? "..." : ""),
        };
        setNodeContent((prev) => ({ ...prev, [article.id]: fallbackContent }));
        return fallbackContent;
      }

      try {
        logger.info(`Generating content for node ${article.id}`);
        const content = await generateNodeContent({
          text: article.content,
          isUser: false, // Articles are always AI-generated content
          subject: subjectInfo.subject,
          moduleTitle: subjectInfo.moduleTitle,
        });

        // Store the generated content
        setNodeContent((prev) => ({ ...prev, [article.id]: content }));
        return content;
      } catch (err) {
        logger.error(
          `Failed to generate content for node ${article.id}: ${err}`
        );
        const fallbackContent = {
          summary:
            article.content.substring(0, 100) +
            (article.content.length > 100 ? "..." : ""),
        };
        setNodeContent((prev) => ({ ...prev, [article.id]: fallbackContent }));
        return fallbackContent;
      }
    },
    [nodeContent, subjectInfo]
  );

  // Helper function to convert an article to a node
  const articleToNode = useCallback(
    async (
      article: Article,
      position: { x: number; y: number }
    ): Promise<ArticleNode> => {
      // Get content for this node (either from cache or generate new)
      const content = await generateContent(article);

      // Type assertion to ensure TypeScript knows the shape
      const nodeContent: { summary: string; takeaways?: string[] } = content;

      return {
        id: article.id,
        type: "articleNode",
        position,
        data: {
          id: article.id,
          content: article.content,
          summary: nodeContent.summary,
          isRoot: article.isRoot,
          takeaways: nodeContent.takeaways || [],
        },
      };
    },
    [generateContent]
  );

  // Helper function to create an edge between two nodes
  const createEdge = useCallback(
    (userQuestion: UserQuestion): QuestionEdge => ({
      id: `e${userQuestion.sourceArticleId}-${userQuestion.destinationArticleId}`,
      source: userQuestion.sourceArticleId,
      target: userQuestion.destinationArticleId,
      type: "smoothstep",
      style: { stroke: "rgba(148, 163, 184, 0.2)", strokeWidth: 2 },
      animated: true,
      data: {
        text: userQuestion.text,
        isImplicit: userQuestion.isImplicit,
      },
    }),
    []
  );

  /**
   * Calculate layout based on articles and questions
   */
  const calculateLayout = useCallback(
    async (
      articles: Article[],
      userQuestions: UserQuestion[]
    ): Promise<LayoutData> => {
      logger.info(
        `Calculating layout for ${articles.length} articles and ${userQuestions.length} questions`
      );

      // Build tree nodes map, keyed by article id
      const nodeMap: { [key: string]: TreeNode } = {};
      let rootNode: TreeNode | null = null;

      // First pass: create all nodes
      articles.forEach((article) => {
        const treeNode: TreeNode = { article, children: [] };
        nodeMap[article.id] = treeNode;

        // Find the root node
        if (article.isRoot) {
          rootNode = treeNode;
        }
      });

      // Second pass: establish parent-child relationships
      userQuestions.forEach((question) => {
        const sourceNode = nodeMap[question.sourceArticleId];
        const targetNode = nodeMap[question.destinationArticleId];

        if (sourceNode && targetNode) {
          sourceNode.children.push(targetNode);
        }
      });

      // If no root node was found, use the first article as root
      if (!rootNode && articles.length > 0) {
        rootNode = nodeMap[articles[0].id];
      }

      // If still no root, we can't calculate a layout
      if (!rootNode) {
        return { nodes: [], edges: [], nodeHeights: {} };
      }

      // Assign positions using a tree layout algorithm
      let currentLeaf = 0;

      function assignPositions(
        node: TreeNode,
        depth: number,
        accumulatedY: number
      ): number {
        const x =
          node.children.length === 0
            ? START_X + currentLeaf++ * HORIZONTAL_SPACING
            : (() => {
                const childrenXPositions = node.children.map((child) =>
                  assignPositions(
                    child,
                    depth + 1,
                    accumulatedY +
                      (nodeHeights[node.article.id] || DEFAULT_NODE_HEIGHT) +
                      VERTICAL_SPACING
                  )
                );
                return (
                  (Math.min(...childrenXPositions) +
                    Math.max(...childrenXPositions)) /
                  2
                );
              })();

        node.position = {
          x,
          y: accumulatedY,
        };

        return x;
      }

      // Assign positions starting from the root node
      assignPositions(rootNode, 0, START_Y);

      // Flatten the tree into nodes and edges arrays
      const computedNodes: ArticleNode[] = [];
      const computedEdges: QuestionEdge[] = [];

      // Process all nodes
      const processedNodes = new Set<string>();

      async function processNode(node: TreeNode) {
        if (processedNodes.has(node.article.id)) return;
        processedNodes.add(node.article.id);

        if (node.position) {
          const computedNode = await articleToNode(node.article, node.position);
          computedNodes.push(computedNode);
        }

        // Process children
        for (const child of node.children) {
          await processNode(child);
        }
      }

      // Process all questions to create edges
      await processNode(rootNode);

      // Create edges from user questions
      userQuestions.forEach((question) => {
        // Only create edges for nodes that were processed
        if (
          processedNodes.has(question.sourceArticleId) &&
          processedNodes.has(question.destinationArticleId)
        ) {
          computedEdges.push(createEdge(question));
        }
      });

      return {
        nodes: computedNodes,
        edges: computedEdges,
        nodeHeights,
      };
    },
    [articleToNode, createEdge, nodeHeights]
  );

  /**
   * Zoom to a specific node
   */
  const zoomToNode = useCallback((nodeId: string) => {
    logger.info(`Zooming to node: ${nodeId}`);
    // We don't need to implement this on the server side,
    // just provide the method that will be used by the UI
  }, []);

  /**
   * Save the current layout to the database
   */
  const saveLayout = useCallback(
    async (
      personalLearningMapId: string,
      layoutData: LayoutData
    ): Promise<void> => {
      if (!personalLearningMapId) {
        logger.warn("Cannot save layout: No personal learning map ID");
        return;
      }

      try {
        logger.info(
          `Saving layout for personal learning map ${personalLearningMapId}`
        );
        setIsLoading(true);
        setError(null);

        await upsertLayoutAsync({
          personalLearningMapId,
          nodes: layoutData.nodes,
          edges: layoutData.edges,
          nodeHeights: layoutData.nodeHeights,
        });

        logger.info(`Layout saved successfully`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to save layout: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [upsertLayoutAsync]
  );

  /**
   * Update node heights
   */
  const updateNodeHeight = useCallback((nodeId: string, height: number) => {
    setNodeHeights((prev) => {
      // Only update if height actually changed
      if (prev[nodeId] === height) {
        return prev;
      }
      return { ...prev, [nodeId]: height };
    });
  }, []);

  /**
   * Update the layout based on articles and questions and save it
   */
  const updateLayout = useCallback(
    async (
      articles: Article[],
      userQuestions: UserQuestion[]
    ): Promise<void> => {
      if (!personalLearningMapId) return;

      // Skip if there are no articles
      if (articles.length === 0) return;

      setIsLoading(true);
      try {
        const layout = await calculateLayout(articles, userQuestions);
        setNodes(layout.nodes);
        setEdges(layout.edges);

        // Save layout to database
        await saveLayout(personalLearningMapId, {
          nodes: layout.nodes,
          edges: layout.edges,
          nodeHeights: nodeHeights,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [personalLearningMapId, calculateLayout, saveLayout, nodeHeights]
  );

  // Load saved layout when available
  useEffect(() => {
    if (savedLayout && !isLoadingLayout) {
      logger.info("Loading saved layout from database");
      setNodes(savedLayout.nodes);
      setEdges(savedLayout.edges);
      setNodeHeights(savedLayout.nodeHeights);
    }
  }, [savedLayout, isLoadingLayout]);

  // Return memoized service object
  return useMemo(
    () => ({
      nodes,
      edges,
      isLoading,
      error,
      nodeHeights,
      nodeContent,
      updateLayout,
      zoomToNode,
      setNodeHeight: updateNodeHeight,
    }),
    [
      nodes,
      edges,
      isLoading,
      error,
      nodeHeights,
      nodeContent,
      updateLayout,
      zoomToNode,
      updateNodeHeight,
    ]
  );
}
