import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLayout, useSaveLayout } from "@/hooks/api/conversations";
import { SerializedMessage, SerializedLayout } from "@/prisma/conversations";
import { Logger } from "@/lib/logger";
import { ConversationNode, ConversationEdge } from "@/types/conversation";
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
  message: SerializedMessage;
  children: TreeNode[];
  position?: { x: number; y: number };
}

/**
 * VisualizationService hook for managing conversation visualization
 * Implements the interface defined in the implementation plan
 */
export function useVisualizationService(
  conversationId: string | null,
  subjectInfo?: {
    subject: string;
    moduleTitle: string;
  }
) {
  // Add dependency array tracking
  const prevDepsRef = useRef<{
    conversationId: string | null;
    subject?: string;
    moduleTitle?: string;
  }>({
    conversationId: null,
  });

  // Check what changed to cause a re-render
  const currentDeps = {
    conversationId,
    subject: subjectInfo?.subject,
    moduleTitle: subjectInfo?.moduleTitle,
  };

  // Log if any dependencies changed
  if (
    prevDepsRef.current.conversationId !== currentDeps.conversationId ||
    prevDepsRef.current.subject !== currentDeps.subject ||
    prevDepsRef.current.moduleTitle !== currentDeps.moduleTitle
  ) {
    console.log("VisualizationService deps changed:", {
      prevDeps: prevDepsRef.current,
      currentDeps,
    });
    prevDepsRef.current = { ...currentDeps };
  }

  // Add logging
  logger.info("Visualization service hook called", {
    conversationId,
    hasSubjectInfo: !!subjectInfo,
  });

  // State
  const [currentView, setCurrentView] = useState<"map" | "plan">("map");
  const [nodes, setNodes] = useState<ConversationNode[]>([]);
  const [edges, setEdges] = useState<ConversationEdge[]>([]);
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
    useLayout(conversationId);
  const { mutateAsync: saveLayoutAsync } = useSaveLayout();

  /**
   * Generate content for a message node using LLM
   */
  const generateContent = useCallback(
    async (message: SerializedMessage) => {
      // Check if we already have content for this node
      if (nodeContent[message.id]) {
        return nodeContent[message.id];
      }

      // Skip if we don't have subject info
      if (!subjectInfo) {
        const fallbackContent = {
          summary:
            message.text.substring(0, 100) +
            (message.text.length > 100 ? "..." : ""),
        };
        setNodeContent((prev) => ({ ...prev, [message.id]: fallbackContent }));
        return fallbackContent;
      }

      try {
        logger.info(`Generating content for node ${message.id}`);
        const content = await generateNodeContent({
          text: message.text,
          isUser: message.isUser,
          subject: subjectInfo.subject,
          moduleTitle: subjectInfo.moduleTitle,
        });

        // Store the generated content
        setNodeContent((prev) => ({ ...prev, [message.id]: content }));
        return content;
      } catch (err) {
        logger.error(
          `Failed to generate content for node ${message.id}: ${err}`
        );
        const fallbackContent = {
          summary:
            message.text.substring(0, 100) +
            (message.text.length > 100 ? "..." : ""),
        };
        setNodeContent((prev) => ({ ...prev, [message.id]: fallbackContent }));
        return fallbackContent;
      }
    },
    [nodeContent, subjectInfo]
  );

  // Helper function to convert a message to a conversation node
  const messageToNode = useCallback(
    async (
      message: SerializedMessage,
      position: { x: number; y: number }
    ): Promise<ConversationNode> => {
      // Get content for this node (either from cache or generate new)
      const content = await generateContent(message);

      // Type assertion to ensure TypeScript knows the shape
      const nodeContent: { summary: string; takeaways?: string[] } = content;

      return {
        id: message.id,
        type: "conversationNode",
        position,
        data: {
          id: message.id,
          text: message.text,
          summary: nodeContent.summary,
          content: message.isUser
            ? undefined
            : {
                summary: nodeContent.summary,
                takeaways: nodeContent.takeaways || [],
              },
          isUser: message.isUser,
        },
      };
    },
    [generateContent]
  );

  // Helper function to create an edge between two nodes
  const createEdge = useCallback(
    (sourceId: string, targetId: string): ConversationEdge => ({
      id: `e${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: "smoothstep",
      style: { stroke: "rgba(148, 163, 184, 0.2)", strokeWidth: 2 },
      animated: true,
    }),
    []
  );

  /**
   * Calculate layout based on messages
   */
  const calculateLayout = useCallback(
    async (
      messages: SerializedMessage[]
    ): Promise<{
      nodes: ConversationNode[];
      edges: ConversationEdge[];
    }> => {
      logger.info(`Calculating layout for ${messages.length} messages`);

      // Build tree nodes map, keyed by message id
      const nodeMap: { [key: string]: TreeNode } = {};
      const roots: TreeNode[] = [];

      messages.forEach((msg) => {
        const treeNode: TreeNode = { message: msg, children: [] };
        nodeMap[msg.id] = treeNode;

        // Determine the parent by checking the parentId
        if (msg.parentId && nodeMap[msg.parentId]) {
          nodeMap[msg.parentId].children.push(treeNode);
        } else {
          roots.push(treeNode);
        }
      });

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
                      (nodeHeights[node.message.id] || DEFAULT_NODE_HEIGHT) +
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

      // Assign positions for all root nodes
      let currentY = START_Y;
      roots.forEach((root) => {
        assignPositions(root, 0, currentY);
        currentY +=
          (nodeHeights[root.message.id] || DEFAULT_NODE_HEIGHT) +
          VERTICAL_SPACING;
      });

      // Flatten the tree into nodes and edges arrays
      const computedNodes: ConversationNode[] = [];
      const computedEdges: ConversationEdge[] = [];

      async function flattenTree(node: TreeNode) {
        const computedNode = await messageToNode(node.message, node.position!);
        computedNodes.push(computedNode);

        for (const child of node.children) {
          computedEdges.push(createEdge(node.message.id, child.message.id));
          await flattenTree(child);
        }
      }

      // Process all root nodes sequentially
      for (const root of roots) {
        await flattenTree(root);
      }

      return { nodes: computedNodes, edges: computedEdges };
    },
    [messageToNode, createEdge, nodeHeights]
  );

  /**
   * Set the current view (map or plan)
   */
  const setView = useCallback((view: "map" | "plan") => {
    logger.info(`Setting view to ${view}`);
    setCurrentView(view);
  }, []);

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
    async (conversationId: string, layout: SerializedLayout): Promise<void> => {
      if (!conversationId) {
        logger.warn("Cannot save layout: No conversation ID");
        return;
      }

      try {
        logger.info(`Saving layout for conversation ${conversationId}`);
        setIsLoading(true);
        setError(null);

        await saveLayoutAsync({
          conversationId,
          nodes: layout.nodes,
          edges: layout.edges,
          nodeHeights: layout.nodeHeights,
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
    [saveLayoutAsync]
  );

  /**
   * Get the layout for a conversation
   */
  const getLayout = useCallback(
    async (conversationId: string): Promise<SerializedLayout | null> => {
      if (!conversationId) {
        logger.warn("Cannot get layout: No conversation ID");
        return null;
      }

      logger.info(`Getting layout for conversation ${conversationId}`);
      return savedLayout || null;
    },
    [savedLayout]
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
   * Update the layout based on messages and save it
   */
  const updateLayout = useCallback(
    async (messages: SerializedMessage[]): Promise<void> => {
      if (!conversationId) return;

      // Skip if there are no messages
      if (messages.length === 0) return;

      // Skip update if nodes already match messages and we're not forcing an update
      // This helps prevent unnecessary recalculations and database writes
      if (nodes.length === messages.length && nodes.length > 0) {
        // Check if message IDs match existing nodes (simplistic check)
        const nodeIds = new Set(nodes.map((node) => node.id));
        const messageIds = new Set(messages.map((msg) => msg.id));

        // If all message IDs exist as nodes already, no need to update
        if (messages.every((msg) => nodeIds.has(msg.id))) {
          logger.info(
            "Skipping layout update - messages already match existing nodes"
          );
          return;
        }
      }

      setIsLoading(true);
      try {
        const layout = await calculateLayout(messages);
        setNodes(layout.nodes);
        setEdges(layout.edges);

        // Save layout to database
        await saveLayout(conversationId, {
          id: "",
          conversationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
    [conversationId, calculateLayout, saveLayout, nodeHeights, nodes]
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
      currentView,
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
      currentView,
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
