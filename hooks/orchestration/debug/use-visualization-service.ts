import { useMemo } from "react";
import { ConversationNode, ConversationEdge } from "@/types/conversation";
import { SerializedMessage } from "@/prisma/conversations";
import { Logger } from "@/lib/logger";

/**
 * Debug facade for VisualizationService
 */
export function useVisualizationService(
  conversationId: string | null,
  subjectInfo?: {
    subject: string;
    moduleTitle: string;
  }
) {
  // Create logger instance
  const logger = new Logger({ context: "Visualization Service (Facade)" });

  // Mock state
  const nodes: ConversationNode[] = [];
  const edges: ConversationEdge[] = [];
  const currentView = { x: 0, y: 0, zoom: 1 };
  const isLoading = false;
  const error = null;
  const nodeHeights: Record<string, number> = {};
  const nodeContent: Record<string, { summary: string; takeaways: string[] }> =
    {};

  // Mock operations
  const updateLayout = async (messages: SerializedMessage[]): Promise<void> => {
    logger.group("updateLayout called", () => {
      logger.info("Parameters", {
        messageCount: messages.length,
      });

      // For debugging, log the first message if available
      if (messages.length > 0) {
        logger.debug("First message details", {
          id: messages[0].id,
          isUser: messages[0].isUser,
          textLength: messages[0].text.length,
        });
      }
    });
  };

  const zoomToNode = (nodeId: string) => {
    logger.info("zoomToNode called", { nodeId });
  };

  const updateNodeHeight = (nodeId: string, height: number) => {
    logger.debug("updateNodeHeight called", { nodeId, height });
  };

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
