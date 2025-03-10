import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "@/lib/logger";

import {
  useCurriculumMapService,
  usePersonalLearningMapService,
  useArticleService,
  useUserQuestionService,
  useContextualTooltipService,
  usePersonalLearningMapVisualizationService,
} from "@/hooks/services";
import { QuestionContext } from "@/hooks/services/user-question-service";
import { TooltipContext } from "@/hooks/services/contextual-tooltip-service";
import { Article, UserQuestion } from "@/types/personal-learning-map";

// Create a logger instance for the orchestrator
const logger = new Logger({
  context: "LearningOrchestrator",
  enabled: true,
});

// Add a custom debug hook for tracking re-renders
function useTrackRenders(componentName: string, props: Record<string, any>) {
  const prevPropsRef = useRef<Record<string, any>>({});
  const renderCountRef = useRef(0);

  // On each render, check what props changed
  useEffect(() => {
    renderCountRef.current += 1;
    const changedProps: Record<string, { prev: any; current: any }> = {};
    const allKeys = new Set([
      ...Object.keys(prevPropsRef.current),
      ...Object.keys(props),
    ]);

    let hasChanges = false;
    allKeys.forEach((key) => {
      if (prevPropsRef.current[key] !== props[key]) {
        changedProps[key] = {
          prev: prevPropsRef.current[key],
          current: props[key],
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      logger.info(
        `${componentName} rendered due to prop changes (render #${renderCountRef.current})`,
        { changedProps }
      );
    } else if (renderCountRef.current > 1) {
      logger.info(
        `${componentName} re-rendered with no prop changes (render #${renderCountRef.current}) - likely due to parent re-render or internal state change`
      );
    }

    prevPropsRef.current = { ...props };
  });

  return renderCountRef.current;
}

// Add a dependency tracking hook
function useTrackDependencies(name: string, dependencies: Record<string, any>) {
  const prevDepsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const changedDeps: Record<string, { prev: any; current: any }> = {};
    let hasChanges = false;

    Object.entries(dependencies).forEach(([key, value]) => {
      if (
        !Object.prototype.hasOwnProperty.call(prevDepsRef.current, key) ||
        !Object.is(prevDepsRef.current[key], value)
      ) {
        changedDeps[key] = {
          prev: prevDepsRef.current[key],
          current: value,
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      logger.debug(`Dependencies changed for ${name}`, { changedDeps });
    }

    prevDepsRef.current = { ...dependencies };
  });
}

// Define the missing type
interface LearningMapOrchestrationState {
  personalLearningMapInitialized: boolean;
  rootArticleCreated: boolean;
  rootArticleFetched: boolean;
  errorMessage: string;
}

/**
 * LearningOrchestrator hook for coordinating all domain services
 */
export function useLearningOrchestrator(
  subjectId: string,
  moduleId: string,
  moduleTitle: string = "",
  moduleDescription: string = ""
) {
  // Track props that could cause re-renders
  const renderCount = useTrackRenders("LearningOrchestrator", {
    subjectId,
    moduleId,
    moduleTitle,
    moduleDescription,
  });

  // Create a unique instance ID for this hook call to track in logs
  const orchestratorInstanceId = useRef(
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Add render counter
  const renderCountRef = useRef(0);
  // Store previous props to detect changes
  const prevProps = useRef({
    subjectId,
    moduleId,
    moduleTitle,
    moduleDescription,
  });

  // State for orchestration
  const [orchestrationState, setOrchestrationState] =
    useState<LearningMapOrchestrationState>({
      personalLearningMapInitialized: false,
      rootArticleCreated: false,
      rootArticleFetched: false,
      errorMessage: "",
    });

  // State for initialization
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize all domain services
  const curriculumMap = useCurriculumMapService(subjectId);
  const personalLearningMap = usePersonalLearningMapService();
  const article = useArticleService();
  const userQuestion = useUserQuestionService(null);
  const tooltip = useContextualTooltipService(null);

  // Create a context object for tooltips and questions
  const learningContext = useMemo(
    () => ({
      subject: subjectId,
      moduleTitle,
      moduleDescription,
    }),
    [subjectId, moduleTitle, moduleDescription]
  );

  // Initialize visualization service after personal learning map is initialized
  const visualizationService = usePersonalLearningMapVisualizationService(
    personalLearningMap.personalLearningMapId,
    {
      subject: subjectId,
      moduleTitle,
    }
  );

  // Memoize the visualization service to prevent unnecessary rerenders
  const visualization = useMemo(
    () => visualizationService,
    [
      visualizationService.nodes,
      visualizationService.edges,
      visualizationService.isLoading,
      visualizationService.error,
    ]
  );

  // NOW track critical state variables AFTER all service initializations
  useTrackDependencies("OrchestrationState", {
    subjectId,
    moduleId,
    isInitializing,
    isInitialized: personalLearningMap.isInitialized,
    personalLearningMapId: personalLearningMap.personalLearningMapId,
    orchestrationState,
  });

  // Add effect for render tracking
  useEffect(() => {
    renderCountRef.current += 1;
    logger.info(
      `Learning Orchestrator RENDERED [count: ${renderCountRef.current}, instance: ${orchestratorInstanceId.current}]`,
      {
        subjectId,
        moduleId,
        renderCount: renderCountRef.current,
      }
    );

    // Log when props change
    if (
      prevProps.current.subjectId !== subjectId ||
      prevProps.current.moduleId !== moduleId
    ) {
      logger.warn(`Key props changed: subjectId or moduleId changed`, {
        prev: {
          subjectId: prevProps.current.subjectId,
          moduleId: prevProps.current.moduleId,
        },
        current: { subjectId, moduleId },
        renderCount: renderCountRef.current,
        instanceId: orchestratorInstanceId.current,
      });
    }

    // Update previous props
    prevProps.current = { subjectId, moduleId, moduleTitle, moduleDescription };
  });

  /**
   * Initialize the personal learning map and related services
   */
  const initialize = async () => {
    try {
      logger.info(
        `Initializing learning orchestrator [Instance: ${orchestratorInstanceId.current}]`,
        {
          currentState: JSON.stringify(orchestrationState),
          isInitializing,
          renderCount: renderCountRef.current,
          personalLearningMapId:
            personalLearningMap.personalLearningMapId || "none",
        }
      );

      // If already initializing or initialized, prevent duplicate calls
      if (isInitializing) {
        logger.info(
          `Initialization already in progress, skipping [Instance: ${orchestratorInstanceId.current}]`
        );
        return personalLearningMap.personalLearningMapId || "";
      }

      if (
        personalLearningMap.isInitialized &&
        personalLearningMap.personalLearningMapId
      ) {
        logger.info(
          `Already initialized, skipping initialization [Instance: ${orchestratorInstanceId.current}]`
        );
        return personalLearningMap.personalLearningMapId;
      }

      setIsInitializing(true);
      setOrchestrationState((prev) => {
        // Only update if not already initialized to prevent loop
        if (personalLearningMap.isInitialized) {
          return prev;
        }

        return {
          ...prev,
          personalLearningMapInitialized: true,
        };
      });

      logger.info(
        `Initializing personal learning map [Instance: ${orchestratorInstanceId.current}]`,
        {
          subjectId,
          moduleId,
          personalLearningMapId: personalLearningMap.personalLearningMapId,
        }
      );

      // The personalLearningMap.initialize method already checks for existing maps
      // and will load one if it exists instead of creating a new one
      const personalLearningMapId = await personalLearningMap.initialize(
        subjectId,
        moduleId
      );

      logger.info(
        `Personal learning map initialized successfully [Instance: ${orchestratorInstanceId.current}]`,
        {
          personalLearningMapId,
          isNewMap: !personalLearningMap.personalLearningMapId,
        }
      );

      return personalLearningMapId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        `Failed to initialize learning orchestrator [Instance: ${orchestratorInstanceId.current}]: ${error.message}`
      );
      setOrchestrationState((prev) => ({
        ...prev,
        errorMessage: error.message,
      }));
      throw error;
    } finally {
      setIsInitializing(false);
    }
  };

  // Use a ref to track if we've already run initialization
  const hasRunInitialization = useRef(false);

  // Find the useEffect that triggers initialization
  useEffect(() => {
    const initializeEffect = async () => {
      logger.info(
        `initializeEffect running [instance: ${orchestratorInstanceId.current}, count: ${renderCountRef.current}]`,
        {
          subjectId,
          moduleId,
          isInitialized: personalLearningMap.isInitialized,
          hasMapId: !!personalLearningMap.personalLearningMapId,
          isInitializing,
        }
      );

      if (
        !personalLearningMap.isInitialized &&
        !isInitializing &&
        subjectId &&
        moduleId
      ) {
        setIsInitializing(true);
        await initialize();
        setIsInitializing(false);
      }
    };

    initializeEffect();

    // Log dependency array values to track what's causing this effect to re-run
    logger.debug(
      `Initialize effect dependencies [instance: ${orchestratorInstanceId.current}]`,
      {
        personalLearningMapInitialized: personalLearningMap.isInitialized,
        initializingState: isInitializing,
        subjectId,
        moduleId,
        renderCount: renderCountRef.current,
      }
    );
  }, [personalLearningMap.isInitialized, isInitializing, subjectId, moduleId]);

  // Create root article when personal learning map is first initialized
  useEffect(() => {
    if (
      !personalLearningMap.isInitialized ||
      !personalLearningMap.personalLearningMapId ||
      article.isArticleReady ||
      article.isLoading ||
      article.isStreamingStarted
    ) {
      return;
    }

    logger.info("Checking for existing root article", {
      personalLearningMapId: personalLearningMap.personalLearningMapId,
    });

    // Check if we already have a root article
    if (personalLearningMap.rootArticle) {
      logger.info("Root article already exists, skipping creation", {
        rootArticleId: personalLearningMap.rootArticle.id,
      });

      // Set the current article to the root article
      article.setCurrentArticle(personalLearningMap.rootArticle.id);

      // Mark root article as created
      setOrchestrationState((prev) => ({
        ...prev,
        rootArticleCreated: true,
      }));

      return;
    }

    logger.info("Creating root article", {
      personalLearningMapId: personalLearningMap.personalLearningMapId,
    });

    // Create module details object from props
    const articleDetails = {
      subject: subjectId,
      moduleTitle,
      moduleDescription,
      message: `Explain ${moduleTitle} to a beginner developer`,
    };

    // Stream the initial article content
    article
      .generateArticleContent(articleDetails)
      .then((content) => {
        // Create the root article with the generated content
        return article.createArticle(
          personalLearningMap.personalLearningMapId!,
          content,
          true // isRoot = true
        );
      })
      .catch((err) => {
        logger.error("Failed to create root article:", err);
        setOrchestrationState((prev) => ({
          ...prev,
          errorMessage: err instanceof Error ? err.message : String(err),
        }));
      });
  }, [
    personalLearningMap.personalLearningMapId,
    personalLearningMap.isInitialized,
    personalLearningMap.rootArticle,
    subjectId,
    moduleTitle,
    moduleDescription,
    article.generateArticleContent,
    article.createArticle,
    article.isLoading,
    article.isArticleReady,
    article.isStreamingStarted,
    article.setCurrentArticle,
  ]);

  // Process root article when content is ready
  const rootArticleProcessingRef = useRef<{
    inProgress: boolean;
    lastAttempt: number;
    attempts: number;
  }>({
    inProgress: false,
    lastAttempt: 0,
    attempts: 0,
  });
  const MAX_PROCESS_ATTEMPTS = 3;
  const PROCESS_ATTEMPT_COOLDOWN = 5000; // 5 seconds

  useEffect(() => {
    let isMounted = true;

    // Don't do anything if we've already processed the root article or if necessary data is missing
    if (
      !article.isArticleReady ||
      orchestrationState.rootArticleCreated ||
      !personalLearningMap.personalLearningMapId ||
      !article.article ||
      article.isLoading
    ) {
      return;
    }

    const processRootArticle = async () => {
      const now = Date.now();
      const state = rootArticleProcessingRef.current;

      // Skip if already in progress
      if (state.inProgress) {
        logger.info("Root article processing already in progress, skipping");
        return;
      }

      // Check for too many attempts within a short period
      if (state.attempts >= MAX_PROCESS_ATTEMPTS) {
        const sinceLastAttempt = now - state.lastAttempt;
        if (sinceLastAttempt < 30000) {
          // 30 seconds cooldown after max attempts
          logger.warn(
            `Too many root article processing attempts (${state.attempts}), cooling down for 30 seconds`
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
        if (sinceLastAttempt < PROCESS_ATTEMPT_COOLDOWN) {
          logger.warn(
            `Root article processing attempt too soon after previous attempt (${sinceLastAttempt}ms), enforcing cooldown`
          );
          return;
        }
      }

      // Update processing state
      state.inProgress = true;
      state.lastAttempt = now;
      state.attempts++;

      logger.info(
        `Processing root article content (attempt ${state.attempts})`
      );

      try {
        if (!article.article) {
          throw new Error("Article is not available");
        }

        // Process tooltips for the article content
        await tooltip.processArticleContent(
          article.article.id,
          article.article.content,
          learningContext as TooltipContext
        );

        // Get articles and questions for visualization
        const articles = personalLearningMap.articles || [];
        const questions = personalLearningMap.userQuestions || [];

        // Update the layout visualization
        await visualization.updateLayout(articles, questions);

        // Zoom to the root article
        visualization.zoomToNode(article.article.id);

        // Generate suggested questions based on content
        await userQuestion.generateSuggestedQuestions(
          article.article.content,
          learningContext as QuestionContext
        );

        // Mark root article as processed
        if (isMounted) {
          setOrchestrationState((prev) => ({
            ...prev,
            rootArticleCreated: true,
            tooltipsReady: true,
            questionsReady: true,
          }));
        }

        // Reset attempts after success
        state.attempts = 0;
        logger.info("Root article processed successfully");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to process root article: ${error.message}`);
        if (isMounted) {
          setOrchestrationState((prev) => ({
            ...prev,
            errorMessage: error.message,
          }));
        }
      } finally {
        state.inProgress = false;
      }
    };

    // Call the process function once
    processRootArticle();

    return () => {
      isMounted = false;
    };
  }, [
    article.isArticleReady,
    orchestrationState.rootArticleCreated,
    personalLearningMap.personalLearningMapId,
    article.article,
    article.isLoading,
    personalLearningMap.articles,
    personalLearningMap.userQuestions,
  ]);

  /**
   * Handle user question
   */
  const pendingUserQuestions = useRef(new Map<string, Promise<void>>());
  const recentUserQuestions = useRef(new Map<string, { timestamp: number }>());
  const DUPLICATE_QUESTION_WINDOW = 5000; // 5 seconds

  const handleUserQuestion = useCallback(
    async (questionText: string) => {
      try {
        // Create a unique hash for this question to detect duplicates
        const questionHash = `${questionText}`;
        const now = Date.now();

        // Check if we've recently processed this exact question
        const recentQuestion = recentUserQuestions.current.get(questionHash);
        if (recentQuestion) {
          const timeSinceLastRequest = now - recentQuestion.timestamp;
          if (timeSinceLastRequest < DUPLICATE_QUESTION_WINDOW) {
            logger.warn(
              `Duplicate question detected within ${timeSinceLastRequest}ms, ignoring: "${questionText.substring(0, 30)}..."`
            );
            return;
          }
        }

        // Check if this exact question is already being processed
        if (pendingUserQuestions.current.has(questionHash)) {
          logger.warn(
            `Question already being processed, ignoring duplicate: "${questionText.substring(0, 30)}..."`
          );
          return;
        }

        const requestId = uuidv4();
        logger.info(`Processing user question with request ID: ${requestId}`);

        // Create a promise for this question processing
        const processingPromise = (async () => {
          try {
            // Mark this question as being processed
            recentUserQuestions.current.set(questionHash, { timestamp: now });

            // Get the current source article
            const sourceArticleId = personalLearningMap.selectedArticleId;

            if (!sourceArticleId) {
              throw new Error("No article selected to ask a question from");
            }

            // Create the user question
            const userQuestionEntity = await userQuestion.createUserQuestion(
              sourceArticleId,
              personalLearningMap.personalLearningMapId!,
              questionText,
              "" // Empty destination ID - will be filled when article is created
            );

            // Get articles and questions for visualization
            const articles = personalLearningMap.articles || [];
            const questions = personalLearningMap.userQuestions || [];

            // Update visualization with the new question
            await visualization.updateLayout(articles, questions);

            // Generate article content in response to the question
            const responseContent = await article.generateArticleContent({
              subject: subjectId,
              moduleTitle,
              moduleDescription,
              message: questionText,
            });

            // Create the article with the generated content
            const newArticle = await article.createArticle(
              personalLearningMap.personalLearningMapId!,
              responseContent,
              false // Not a root article
            );

            // Process tooltips for the new article
            await tooltip.processArticleContent(
              newArticle.id,
              newArticle.content,
              learningContext as TooltipContext
            );

            // Get updated articles and questions for visualization
            const updatedArticles = personalLearningMap.articles || [];
            const updatedQuestions = personalLearningMap.userQuestions || [];

            // Update visualization with the article response
            await visualization.updateLayout(updatedArticles, updatedQuestions);

            // Select and zoom to the new article
            personalLearningMap.selectArticle(newArticle.id);
            visualization.zoomToNode(newArticle.id);

            // Generate suggested questions for the new article
            await userQuestion.generateSuggestedQuestions(
              newArticle.content,
              learningContext as QuestionContext
            );

            logger.info(
              `User question handled successfully (request ID: ${requestId})`
            );
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error(`Failed to handle user question: ${error.message}`);
            setOrchestrationState((prev) => ({
              ...prev,
              errorMessage: error.message,
            }));
            throw error;
          } finally {
            // Clean up after processing is complete
            pendingUserQuestions.current.delete(questionHash);
          }
        })();

        // Store the promise
        pendingUserQuestions.current.set(questionHash, processingPromise);

        // Wait for processing to complete
        await processingPromise;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to handle user question: ${error.message}`);
        setOrchestrationState((prev) => ({
          ...prev,
          errorMessage: error.message,
        }));
        throw error;
      }
    },
    [
      personalLearningMap,
      userQuestion,
      article,
      visualization,
      tooltip,
      subjectId,
      moduleTitle,
      moduleDescription,
      learningContext,
    ]
  );

  /**
   * Handle clicking on a suggested question
   */
  const handleSuggestedQuestionClick = useCallback(
    async (question: string) => {
      await handleUserQuestion(question);
    },
    [handleUserQuestion]
  );

  /**
   * Handle "Learn More" about a term
   */
  const handleLearnMoreAboutTerm = useCallback(
    async (term: string) => {
      const questionText = `Tell me more about ${term}`;
      await handleUserQuestion(questionText);
    },
    [handleUserQuestion]
  );

  /**
   * Handle refreshing the learning session
   */
  const handleRefresh = useCallback(async () => {
    try {
      logger.info("Refreshing learning session");

      // Reset all services
      article.setCurrentArticle(null); // Reset article instead of resetArticle
      tooltip.resetState();
      userQuestion.resetSuggestedQuestions();

      // Reset initialization tracking
      hasRunInitialization.current = false;

      // Reset orchestration state
      setOrchestrationState({
        personalLearningMapInitialized: false,
        rootArticleCreated: false,
        rootArticleFetched: false,
        errorMessage: "",
      });

      // Re-initialize - this will either load an existing map or create a new one
      await initialize();

      logger.info("Learning session refreshed successfully");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`Failed to refresh learning session: ${error.message}`);
      setOrchestrationState((prev) => ({
        ...prev,
        errorMessage: error.message,
      }));
      throw error;
    }
  }, [initialize, article, tooltip, userQuestion]);

  /**
   * Handle clicking on a node in the visualization
   */
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      logger.info(`Selecting node: ${nodeId}`);

      // Determine if it's an article or question node and handle accordingly
      const isArticleNode = visualization.nodes?.some(
        (node) => node.id === nodeId && node.type === "article"
      );

      if (isArticleNode) {
        personalLearningMap.selectArticle(nodeId);
      }

      visualization.zoomToNode(nodeId);
    },
    [personalLearningMap, visualization]
  );

  // Update visualization when articles or questions change
  useEffect(() => {
    if (
      visualization &&
      personalLearningMap.personalLearningMapId &&
      !visualization.isLoading
    ) {
      const articles = personalLearningMap.articles || [];
      const questions = personalLearningMap.userQuestions || [];

      visualization.updateLayout(articles, questions).catch((err) => {
        logger.error(`Failed to update layout: ${err.message}`);
      });
    }
  }, [
    personalLearningMap.personalLearningMapId,
    personalLearningMap.articles,
    personalLearningMap.userQuestions,
    visualization,
  ]);

  return useMemo(
    () => ({
      // Services
      curriculumMap,
      personalLearningMap,
      article,
      userQuestion,
      tooltip,
      visualization,

      // Orchestration state
      isInitializing,
      error: orchestrationState.errorMessage,
      orchestrationState,

      // Event handlers
      handleSuggestedQuestionClick,
      handleUserQuestion,
      handleLearnMoreAboutTerm,
      handleRefresh,
      handleNodeClick,
    }),
    [
      curriculumMap,
      personalLearningMap,
      article,
      userQuestion,
      tooltip,
      visualization,
      isInitializing,
      orchestrationState,
      handleSuggestedQuestionClick,
      handleUserQuestion,
      handleLearnMoreAboutTerm,
      handleRefresh,
      handleNodeClick,
    ]
  );
}
