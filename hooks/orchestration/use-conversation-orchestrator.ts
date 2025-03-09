import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLessonService } from "@/hooks/services/use-lesson-service";
import {
  useTooltipService,
  TooltipContext,
} from "@/hooks/services/use-tooltip-service";
import { useQuestionService } from "@/hooks/services/use-question-service";
import { useConversationService } from "@/hooks/services/use-conversation-service";
import { useVisualizationService } from "@/hooks/services/use-visualization-service";
import * as debugHooks from "@/hooks/orchestration/debug";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "@/lib/logger";

// Create a logger instance for the orchestrator
const logger = new Logger({
  context: "ConversationOrchestrator",
  enabled: true,
});

/**
 * ConversationOrchestrator hook for coordinating all services
 */
export function useConversationOrchestrator(
  subjectId: string,
  moduleId: string,
  moduleTitle: string = "",
  moduleDescription: string = ""
) {
  const lesson = useLessonService();
  const tooltips = useTooltipService();
  const questions = useQuestionService();
  const conversation = useConversationService();

  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [orchestrationState, setOrchestrationState] = useState({
    tooltipsReady: false,
    questionsReady: false,
    conversationInitialized: false,
    initialMessagesSaved: false,
  });

  // Create tooltip context
  const tooltipContext = useMemo<TooltipContext>(
    () => ({
      subject: subjectId,
      moduleTitle,
      moduleDescription,
    }),
    [subjectId, moduleTitle, moduleDescription]
  );

  // Initialize visualization service after conversation is initialized
  const visualizationContext = useMemo(
    () => ({
      subject: subjectId,
      moduleTitle,
    }),
    [subjectId, moduleTitle]
  );

  // Initialize visualization service after conversation is initialized
  // Call the hook at the top level, not inside useMemo
  const visualizationService = debugHooks.useVisualizationService(
    conversation.conversationId,
    visualizationContext
  );

  // Memoize the returned value
  const visualization = useMemo(
    () => visualizationService,
    [
      visualizationService.nodes,
      visualizationService.edges,
      visualizationService.isLoading,
      visualizationService.error,
    ]
  );

  /**
   * Initialize the conversation and services
   */
  const initialize = useCallback(async () => {
    try {
      logger.info("Initializing conversation orchestrator", {
        currentState: JSON.stringify(orchestrationState),
        isInitializing,
      });

      // If already initializing or initialized, prevent duplicate calls
      if (isInitializing) {
        logger.info("Initialization already in progress, skipping");
        return conversation.conversationId || "";
      }

      if (conversation.isInitialized && conversation.conversationId) {
        logger.info("Already initialized, skipping initialization");
        return conversation.conversationId;
      }

      setIsInitializing(true);
      setError(null);

      logger.info("Initializing conversation", {
        subjectId,
        moduleId,
        conversationId: conversation.conversationId,
      });

      // Check if we already have a valid conversation
      if (conversation.conversationId) {
        logger.info("Using existing conversation", {
          conversationId: conversation.conversationId,
        });

        // Mark as initialized
        setOrchestrationState((prev) => ({
          ...prev,
          conversationInitialized: true,
        }));

        return conversation.conversationId;
      }

      // Initialize conversation
      const conversationId = await conversation.initialize(subjectId, moduleId);

      logger.info("Conversation initialized successfully", {
        conversationId,
      });

      setOrchestrationState((prev) => {
        // Only update if not already initialized to prevent loop
        if (conversation.isInitialized) {
          return prev;
        }

        return {
          ...prev,
          conversationInitialized: true,
        };
      });
      return conversationId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to initialize orchestrator: ${error.message}`);
      setError(error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [
    // Use stable dependencies to prevent unnecessary recreation
    subjectId,
    moduleId,
    conversation.initialize, // Use the function reference
    conversation.conversationId, // Only the ID, not the entire conversation object
    isInitializing,
    // Use a ref for orchestrationState.conversationInitialized to avoid dependencies
  ]);

  // Create a ref to track the initialized state to avoid dependency cycles
  const conversationInitializedRef = useRef(false);

  // Create a ref to track initialization effect dependencies
  const initEffectDepsRef = useRef({
    conversationInitialized: false,
    isInitializing: false,
    initializeStr: "",
  });

  // Use a ref to track if we've already run initialization
  const hasRunInitialization = useRef(false);

  // Initialize only once when component mounts
  useEffect(() => {
    let mounted = true;

    // If we've already run initialization, skip
    if (hasRunInitialization.current) {
      logger.info("Initialization already run, skipping");
      return;
    }

    // Get the current dependencies
    const currentDeps = {
      conversationInitialized: conversation.isInitialized,
      isInitializing,
      initializeStr: initialize.toString().substring(0, 50),
    };

    // Update ref for next comparison
    initEffectDepsRef.current = currentDeps;

    // Only run if we haven't initialized yet and aren't already initializing
    if (!conversation.isInitialized && !isInitializing) {
      // Mark that we've run initialization
      hasRunInitialization.current = true;

      // Run initialization
      initialize().catch((err) => {
        if (mounted) {
          logger.error("Initialization failed:", err);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to only run once on mount

  // Stream initial lesson when conversation is first initialized
  useEffect(() => {
    if (
      !conversation.isInitialized ||
      !conversation.conversationId ||
      lesson.isLessonReady ||
      lesson.isLoading ||
      lesson.isStreamingStarted
    ) {
      return;
    }

    logger.info("Streaming initial lesson content", {
      conversationId: conversation.conversationId,
    });

    // Create module details object from props
    const moduleDetails = {
      subject: subjectId,
      moduleTitle,
      moduleDescription,
      message: `Explain ${moduleTitle} to a beginner developer`,
    };

    // Stream the initial lesson
    lesson.streamLesson(moduleDetails).catch((err) => {
      logger.error("Failed to stream lesson:", err);
      setError(new Error(`Failed to stream lesson: ${err.message}`));
    });
  }, [
    // Simplified dependencies
    conversation.conversationId,
    // Use the most stable dependencies possible to prevent unnecessary reruns
    subjectId,
    moduleTitle,
    moduleDescription,
    lesson.streamLesson,
    lesson.isLoading,
    lesson.isLessonReady,
    lesson.isStreamingStarted,
  ]);

  // Save initial messages when lesson is ready
  const initialMessageProcessingRef = useRef<{
    inProgress: boolean;
    lastAttempt: number;
    attempts: number;
  }>({
    inProgress: false,
    lastAttempt: 0,
    attempts: 0,
  });
  const MAX_SAVE_ATTEMPTS = 3;
  const SAVE_ATTEMPT_COOLDOWN = 5000; // 5 seconds

  useEffect(() => {
    let isMounted = true;

    // Don't do anything if we've already saved initial messages or if necessary data is missing
    if (
      !lesson.isLessonReady ||
      orchestrationState.initialMessagesSaved ||
      !conversation.conversationId ||
      !lesson.content ||
      lesson.isLoading
    ) {
      return;
    }

    const saveInitialMessages = async () => {
      const now = Date.now();
      const state = initialMessageProcessingRef.current;

      // Skip if already in progress
      if (state.inProgress) {
        logger.info("Initial message saving already in progress, skipping");
        return;
      }

      // Check for too many attempts within a short period
      if (state.attempts >= MAX_SAVE_ATTEMPTS) {
        const sinceLastAttempt = now - state.lastAttempt;
        if (sinceLastAttempt < 30000) {
          // 30 seconds cooldown after max attempts
          logger.warn(
            `Too many initial message save attempts (${state.attempts}), cooling down for 30 seconds`
          );
          return;
        } else {
          // Reset attempts after cooldown
          state.attempts = 0;
        }
      }

      // Check for minimum interval between attempts
      if (state.lastAttempt > 0) {
        const sinceLastAttempt = now - state.lastAttempt;
        if (sinceLastAttempt < SAVE_ATTEMPT_COOLDOWN) {
          logger.warn(
            `Initial message save attempt too soon after previous attempt (${sinceLastAttempt}ms), enforcing cooldown`
          );
          return;
        }
      }

      // Update processing state
      state.inProgress = true;
      state.lastAttempt = now;
      state.attempts++;

      logger.info(
        `Saving initial conversation messages (attempt ${state.attempts})`
      );

      try {
        // Define the initial system prompt
        const systemPrompt = `Explain ${moduleTitle} clearly for someone learning this topic. Provide helpful context and examples.`;

        // Save the initial user message (system prompt)
        await conversation.addUserMessage(systemPrompt);

        // Process tooltips for the lesson content
        await tooltips.processContent(lesson.content, tooltipContext);

        // Save the AI response with tooltips
        const aiMessage = await conversation.addAIResponse(
          lesson.content,
          undefined, // Undefined for first message (no parent)
          tooltips.tooltips,
          "initial-lesson"
        );

        // Update visualization with both messages
        await visualization.updateLayout(conversation.messages);

        // Select the AI message
        conversation.selectMessage(aiMessage.id);
        visualization.zoomToNode(aiMessage.id);

        // Generate follow-up questions based on content
        await questions.processContent(lesson.content, tooltipContext);

        // Mark initial messages as saved
        if (isMounted) {
          setOrchestrationState((prev) => ({
            ...prev,
            initialMessagesSaved: true,
            tooltipsReady: true,
            questionsReady: true,
          }));
        }

        // Reset attempts after success
        state.attempts = 0;
        logger.info("Initial conversation messages saved successfully");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to save initial messages: ${error.message}`);
        if (isMounted) {
          setError(error);
        }
      } finally {
        state.inProgress = false;
      }
    };

    // Call the save function once
    saveInitialMessages();

    return () => {
      isMounted = false;
    };
  }, [
    // Update dependencies to use lesson service state
    lesson.isLessonReady,
    orchestrationState.initialMessagesSaved,
    conversation.conversationId,
    lesson.content,
    lesson.isLoading,
  ]);

  /**
   * Handle user message
   */
  const pendingUserMessages = useRef(new Map<string, Promise<void>>());
  const recentUserMessages = useRef(new Map<string, { timestamp: number }>());
  const DUPLICATE_MESSAGE_WINDOW = 5000; // 5 seconds

  const handleUserMessage = useCallback(
    async (message: string) => {
      try {
        // Create a unique hash for this message to detect duplicates
        const messageHash = `${message}`;
        const now = Date.now();

        // Check if we've recently processed this exact message
        const recentMessage = recentUserMessages.current.get(messageHash);
        if (recentMessage) {
          const timeSinceLastRequest = now - recentMessage.timestamp;
          if (timeSinceLastRequest < DUPLICATE_MESSAGE_WINDOW) {
            logger.warn(
              `Duplicate message detected within ${timeSinceLastRequest}ms, ignoring: "${message.substring(0, 30)}..."`
            );
            return;
          }
        }

        // Check if this exact message is already being processed
        if (pendingUserMessages.current.has(messageHash)) {
          logger.warn(
            `Message already being processed, ignoring duplicate: "${message.substring(0, 30)}..."`
          );
          return;
        }

        const requestId = uuidv4();
        logger.info(`Processing user message with request ID: ${requestId}`);

        // Create a promise for this message processing
        const processingPromise = (async () => {
          try {
            // Mark this message as being processed
            recentUserMessages.current.set(messageHash, { timestamp: now });

            // Add user message to conversation
            const userMessage = await conversation.addUserMessage(message);

            // Update visualization with the new message
            await visualization.updateLayout(conversation.messages);

            // Generate AI response
            const responseText = await lesson.generateResponse(
              message,
              requestId
            );

            // Process tooltips for the response
            await tooltips.processContent(responseText, tooltipContext);

            // Add AI response to conversation
            const aiMessage = await conversation.addAIResponse(
              responseText,
              userMessage.id,
              tooltips.tooltips,
              requestId
            );

            // Update visualization with AI response
            await visualization.updateLayout(conversation.messages);

            // Select the most recent message
            conversation.selectMessage(aiMessage.id);
            visualization.zoomToNode(aiMessage.id);

            logger.info(
              `User message handled successfully (request ID: ${requestId})`
            );
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error(`Failed to handle user message: ${error.message}`);
            setError(error);
            throw error;
          } finally {
            // Clean up after processing is complete
            pendingUserMessages.current.delete(messageHash);
          }
        })();

        // Store the promise
        pendingUserMessages.current.set(messageHash, processingPromise);

        // Wait for processing to complete
        await processingPromise;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to handle user message: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    [conversation, visualization, lesson, tooltips, tooltipContext]
  );

  /**
   * Handle clicking on a suggested question
   */
  const handleQuestionClick = useCallback(
    async (question: string) => {
      await handleUserMessage(question);
    },
    [handleUserMessage]
  );

  /**
   * Handle "Learn More" about a concept
   */
  const handleLearnMore = useCallback(
    async (concept: string) => {
      const message = `Tell me more about ${concept}`;
      await handleUserMessage(message);
    },
    [handleUserMessage]
  );

  /**
   * Handle refreshing the conversation
   */
  const handleRefresh = useCallback(async () => {
    try {
      logger.info("Refreshing conversation");

      // Reset all services
      lesson.resetLesson();
      tooltips.resetTooltips();
      questions.resetQuestions();

      // Re-initialize
      await initialize();

      logger.info("Conversation refreshed successfully");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to refresh conversation: ${error.message}`);
      setError(error);
      throw error;
    }
  }, [initialize, lesson, tooltips, questions]);

  /**
   * Handle clicking on a node in the visualization
   */
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      logger.info(`Selecting node: ${nodeId}`);
      conversation.selectMessage(nodeId);
      visualization.zoomToNode(nodeId);
    },
    [conversation, visualization]
  );

  // Update visualization when messages change
  useEffect(() => {
    if (
      visualization &&
      conversation.conversationId &&
      conversation.messages?.length > 0 &&
      !visualization.isLoading
    ) {
      // Check if the node IDs match the message IDs already
      const messageIds = new Set(conversation.messages.map((m) => m.id));
      const nodeIds = new Set(visualization.nodes?.map((n) => n.id) || []);

      // Skip if node IDs and message IDs are the same sets (just in a different order perhaps)
      if (
        nodeIds.size === messageIds.size &&
        [...messageIds].every((id) => nodeIds.has(id))
      ) {
        return;
      }

      visualization.updateLayout(conversation.messages).catch((err) => {
        logger.error(`Failed to update layout: ${err.message}`);
      });
    }
    // Only depend on these specific properties, not the entire objects
  }, [
    conversation.conversationId,
    conversation.messages,
    visualization,
    // Don't include functions in dependency array
  ]);

  return useMemo(
    () => ({
      // Services
      lesson,
      tooltips,
      questions,
      conversation,
      visualization,

      // Orchestration state
      isInitializing,
      error,
      orchestrationState,

      // Event handlers
      handleQuestionClick,
      handleUserMessage,
      handleLearnMore,
      handleRefresh,
      handleNodeClick,
    }),
    [
      lesson,
      tooltips,
      questions,
      conversation,
      visualization,
      isInitializing,
      error,
      orchestrationState,
      handleQuestionClick,
      handleUserMessage,
      handleLearnMore,
      handleRefresh,
      handleNodeClick,
    ]
  );
}
