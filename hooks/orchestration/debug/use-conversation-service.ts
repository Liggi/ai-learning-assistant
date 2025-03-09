import { useMemo } from "react";
import { SerializedMessage } from "@/prisma/conversations";
import { Logger } from "@/lib/logger";

/**
 * Debug facade for ConversationService
 */
export function useConversationService() {
  // Create logger instance
  const logger = new Logger({ context: "Conversation Service (Facade)" });

  // Mock state
  const conversationId = "mock-conversation-id";
  const messages: SerializedMessage[] = [];
  const selectedMessageId = null;
  const isProcessingMessage = false;
  const isLoadingConversation = false;
  const error = null;

  // Mock operations
  const initialize = async (
    subjectId: string,
    moduleId: string
  ): Promise<string> => {
    logger.info("initialize called", { subjectId, moduleId });
    return conversationId;
  };

  const addUserMessage = async (
    content: string,
    parentId?: string
  ): Promise<SerializedMessage> => {
    logger.info("addUserMessage called", { content, parentId });
    const mockMessage: SerializedMessage = {
      id: `mock-user-message-${Date.now()}`,
      conversationId,
      text: content,
      isUser: true,
      parentId: parentId || null,
      tooltips: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockMessage;
  };

  const addAIResponse = async (
    content: string,
    parentId: string,
    tooltips?: Record<string, string>,
    requestId?: string
  ): Promise<SerializedMessage> => {
    logger.group("addAIResponse called", () => {
      logger.info("Parameters", {
        contentLength: content.length,
        parentId,
        tooltipsCount: tooltips ? Object.keys(tooltips).length : 0,
        requestId,
      });
    });

    const mockMessage: SerializedMessage = {
      id: `mock-ai-message-${Date.now()}`,
      conversationId,
      text: content,
      isUser: false,
      parentId,
      tooltips: tooltips || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockMessage;
  };

  const selectMessage = (messageId: string | null) => {
    logger.info("selectMessage called", { messageId });
  };

  const getMessageById = (messageId: string): SerializedMessage | undefined => {
    logger.info("getMessageById called", { messageId });
    return messages.find((m) => m.id === messageId);
  };

  // Return memoized service object
  return useMemo(
    () => ({
      // State
      conversationId,
      messages,
      selectedMessageId,
      isProcessingMessage,
      isLoadingConversation,
      error,

      // Operations
      initialize,
      addUserMessage,
      addAIResponse,
      selectMessage,
      getMessageById,
    }),
    [
      conversationId,
      messages,
      selectedMessageId,
      isProcessingMessage,
      isLoadingConversation,
      error,
      initialize,
      addUserMessage,
      addAIResponse,
      selectMessage,
      getMessageById,
    ]
  );
}
