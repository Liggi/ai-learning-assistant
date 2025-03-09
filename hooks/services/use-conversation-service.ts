import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  useConversation,
  useMessages,
  useAddMessage,
  useCreateConversation,
} from "@/hooks/api/conversations";
import { SerializedMessage } from "@/prisma/conversations";
import { Logger } from "@/lib/logger";

// Create a logger instance for the conversation service
const logger = new Logger({ context: "ConversationService" });

/**
 * ConversationService hook for managing conversation state and operations
 * Implements the interface defined in the implementation plan
 */
export function useConversationService() {
  // State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);

  // API hooks
  const { data: conversation, isLoading: isLoadingConversation } =
    useConversation(conversationId);
  const { data: messages = [] } = useMessages(conversationId);
  const { mutateAsync: createConversationAsync } = useCreateConversation();
  const { mutateAsync: addMessageAsync } = useAddMessage();

  /**
   * Initialize a new conversation or load an existing one
   */
  const initialize = useCallback(
    async (subjectId: string, moduleId: string): Promise<string> => {
      try {
        setError(null);

        // If we already have a conversation ID, just return it
        if (conversationId) {
          // Ensure initialization state is set
          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            setIsInitialized(true);
          }

          return conversationId;
        }

        const newConversation = await createConversationAsync({
          subjectId,
          moduleId,
        });

        logger.info("Created new conversation", {
          conversationId: newConversation.id,
          conversation: newConversation,
        });

        setConversationId(newConversation.id);

        // Mark as initialized
        isInitializedRef.current = true;
        setIsInitialized(true);
        return newConversation.id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to initialize conversation: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    [createConversationAsync, conversationId, isLoadingConversation]
  );

  /**
   * Add a user message to the conversation
   */
  const addUserMessage = useCallback(
    async (text: string, parentId?: string): Promise<SerializedMessage> => {
      if (!conversationId) {
        const error = new Error("Cannot add message: No active conversation");
        setError(error);
        throw error;
      }

      try {
        logger.info(`Adding user message to conversation ${conversationId}`);
        setIsProcessingMessage(true);

        const message = await addMessageAsync({
          conversationId,
          text,
          isUser: true,
          parentId,
        });

        logger.info(`Added user message with ID: ${message.id}`);
        return message;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to add user message: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsProcessingMessage(false);
      }
    },
    [conversationId, addMessageAsync]
  );

  /**
   * Add an AI response to the conversation
   */
  const addAIResponse = useCallback(
    async (
      text: string,
      parentId?: string,
      tooltips?: Record<string, string>,
      requestId?: string
    ): Promise<SerializedMessage> => {
      if (!conversationId) {
        const error = new Error(
          "Cannot add AI response: No active conversation"
        );
        setError(error);
        throw error;
      }

      try {
        setIsProcessingMessage(true);

        logger.info("Saving AI response in conversation", {
          conversationId,
          text,
          isUser: false,
          parentId,
          tooltips,
        });

        // @TODO: Allow the `parentId` to be null, the initial node won't have a parent
        const message = await addMessageAsync({
          conversationId,
          text,
          isUser: false,
          parentId,
          tooltips,
        });

        logger.info(`Added AI response with ID: ${message.id}`);
        return message;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to add AI response: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsProcessingMessage(false);
      }
    },
    [conversationId, addMessageAsync]
  );

  /**
   * Select a message in the conversation
   */
  const selectMessage = useCallback((messageId: string) => {
    logger.info(`Selecting message: ${messageId}`);
    setSelectedMessageId(messageId);
  }, []);

  /**
   * Get a message by its ID
   */
  const getMessageById = useCallback(
    (messageId: string): SerializedMessage | undefined => {
      return messages.find((message) => message.id === messageId);
    },
    [messages]
  );

  return useMemo(
    () => ({
      // State
      conversationId,
      messages,
      selectedMessageId,
      isProcessingMessage,
      isLoadingConversation,
      isInitialized,
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
      isInitialized,
      error,
      initialize,
      addUserMessage,
      addAIResponse,
      selectMessage,
      getMessageById,
    ]
  );
}
