import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  usePersonalLearningMap,
  usePersonalLearningMapsByModule,
  useCreatePersonalLearningMap,
  useUpdatePersonalLearningMap,
  useUpdateMapContext,
  useDeletePersonalLearningMap,
} from "@/hooks/api/personal-learning-maps";
import {
  useArticle,
  useArticlesByPersonalLearningMap,
  useRootArticle,
  useCreateArticle,
  useUpdateArticle,
} from "@/hooks/api/articles";
import {
  useUserQuestionsByPersonalLearningMap,
  useCreateUserQuestion,
} from "@/hooks/api/user-questions";
import { SerializedPersonalLearningMap } from "@/prisma/personal-learning-maps";
import type { Article } from "@/types/personal-learning-map";
import { Logger } from "@/lib/logger";
import { useSubjectCurriculumMapId } from "@/hooks/api/subjects";
import { getSubjectCurriculumMapId } from "@/prisma/subjects";

// Create a logger instance for the personal learning map service
const logger = new Logger({ context: "PersonalLearningMapService" });

/**
 * PersonalLearningMapService hook for managing personal learning map state and operations
 * Replaces the previous conversation service with the new domain model
 */
export function usePersonalLearningMapService() {
  // State
  const [personalLearningMapId, setPersonalLearningMapId] = useState<
    string | null
  >(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null
  );
  const [isProcessingArticle, setIsProcessingArticle] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);

  // Track current module context for initialization
  const [initContext, setInitContext] = useState<{
    subjectId?: string;
    curriculumMapId?: string;
    moduleId?: string;
  }>({});

  // API hooks
  const { data: personalLearningMap, isLoading: isLoadingMap } =
    usePersonalLearningMap(personalLearningMapId);
  const { data: articles = [] } = useArticlesByPersonalLearningMap(
    personalLearningMapId
  );
  const { data: rootArticle } = useRootArticle(personalLearningMapId);
  const { data: userQuestions = [] } = useUserQuestionsByPersonalLearningMap(
    personalLearningMapId
  );
  // Fetch existing maps for the current module context
  const { data: existingMaps = [], refetch: refetchExistingMaps } =
    usePersonalLearningMapsByModule(
      initContext.curriculumMapId || null,
      initContext.moduleId || null
    );
  const { mutateAsync: createPersonalLearningMapAsync } =
    useCreatePersonalLearningMap();
  const { mutateAsync: updatePersonalLearningMapAsync } =
    useUpdatePersonalLearningMap();
  const { mutateAsync: updateMapContextAsync } = useUpdateMapContext();
  const { mutateAsync: createArticleAsync } = useCreateArticle();
  const { mutateAsync: createUserQuestionAsync } = useCreateUserQuestion();
  const { data: curriculumMapResponse } = useSubjectCurriculumMapId(
    initContext.subjectId || null
  );

  /**
   * Initialize a new personal learning map or load an existing one
   */
  const initialize = useCallback(
    async (subjectId: string, moduleId: string): Promise<string> => {
      try {
        setError(null);

        // If we already have a personal learning map ID, just return it
        if (personalLearningMapId) {
          // Ensure initialization state is set
          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            setIsInitialized(true);
          }

          return personalLearningMapId;
        }

        // Get the curriculum map ID for the subject using our server function
        const curriculumMapResponse = await getSubjectCurriculumMapId({
          data: { subjectId },
        });

        if (!curriculumMapResponse) {
          throw new Error(
            `Could not get curriculum map for subject: ${subjectId}`
          );
        }

        const curriculumMapId = curriculumMapResponse.curriculumMapId;

        // Update the initialization context to trigger the usePersonalLearningMapsByModule query
        setInitContext({ subjectId, curriculumMapId, moduleId });

        // Refetch to ensure we have the latest data
        await refetchExistingMaps();

        // Check if there's an existing map for this module
        const existingMap = existingMaps[0];

        if (existingMap) {
          logger.info("Found existing personal learning map", {
            personalLearningMapId: existingMap.id,
            map: existingMap,
          });

          setPersonalLearningMapId(existingMap.id);

          // Mark as initialized
          isInitializedRef.current = true;
          setIsInitialized(true);
          return existingMap.id;
        }

        // Create a new personal learning map
        const newMap = await createPersonalLearningMapAsync({
          subjectId,
          moduleId,
        });

        logger.info("Created new personal learning map", {
          personalLearningMapId: newMap.id,
          map: newMap,
        });

        setPersonalLearningMapId(newMap.id);

        // Mark as initialized
        isInitializedRef.current = true;
        setIsInitialized(true);
        return newMap.id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(
          `Failed to initialize personal learning map: ${error.message}`
        );
        setError(error);
        throw error;
      }
    },
    [
      createPersonalLearningMapAsync,
      personalLearningMapId,
      isLoadingMap,
      existingMaps,
      refetchExistingMaps,
      getSubjectCurriculumMapId,
    ]
  );

  /**
   * Create a root article for the personal learning map
   */
  const createRootArticle = useCallback(
    async (content: string): Promise<Article> => {
      if (!personalLearningMapId) {
        const error = new Error(
          "Cannot create root article: No active personal learning map"
        );
        setError(error);
        throw error;
      }

      try {
        logger.info(
          `Creating root article for personal learning map ${personalLearningMapId}`
        );
        setIsProcessingArticle(true);

        const article = await createArticleAsync({
          personalLearningMapId,
          content,
          isRoot: true,
        });

        logger.info(`Created root article with ID: ${article.id}`);
        return article;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to create root article: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsProcessingArticle(false);
      }
    },
    [personalLearningMapId, createArticleAsync]
  );

  /**
   * Create a new article in response to a user question
   */
  const createArticleFromQuestion = useCallback(
    async (
      questionText: string,
      sourceArticleId: string,
      content: string,
      isImplicit: boolean = false
    ): Promise<{ article: Article; questionId: string }> => {
      if (!personalLearningMapId) {
        const error = new Error(
          "Cannot create article: No active personal learning map"
        );
        setError(error);
        throw error;
      }

      try {
        setIsProcessingArticle(true);

        logger.info("Creating new article from question", {
          personalLearningMapId,
          sourceArticleId,
          questionText,
          isImplicit,
        });

        // First create the article
        const article = await createArticleAsync({
          personalLearningMapId,
          content,
          isRoot: false,
        });

        logger.info(`Created article with ID: ${article.id}`);

        // Then create the user question connecting the source article to this new article
        const userQuestion = await createUserQuestionAsync({
          personalLearningMapId,
          text: questionText,
          sourceArticleId,
          destinationArticleId: article.id,
          isImplicit,
        });

        logger.info(`Created user question with ID: ${userQuestion.id}`);

        return { article, questionId: userQuestion.id };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(
          `Failed to create article from question: ${error.message}`
        );
        setError(error);
        throw error;
      } finally {
        setIsProcessingArticle(false);
      }
    },
    [personalLearningMapId, createArticleAsync, createUserQuestionAsync]
  );

  /**
   * Update the map context to associate with a different module
   */
  const updateContext = useCallback(
    async (
      subjectId: string,
      curriculumMapId: string,
      moduleId: string
    ): Promise<void> => {
      if (!personalLearningMapId) {
        const error = new Error(
          "Cannot update context: No active personal learning map"
        );
        setError(error);
        throw error;
      }

      try {
        logger.info("Updating map context", {
          personalLearningMapId,
          subjectId,
          curriculumMapId,
          moduleId,
        });

        await updateMapContextAsync({
          personalLearningMapId,
          subjectId,
          curriculumMapId,
          moduleId,
        });

        logger.info("Updated map context successfully");
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to update map context: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    [personalLearningMapId, updateMapContextAsync]
  );

  /**
   * Select an article in the personal learning map
   */
  const selectArticle = useCallback((articleId: string) => {
    logger.info(`Selecting article: ${articleId}`);
    setSelectedArticleId(articleId);
  }, []);

  /**
   * Get an article by its ID
   */
  const getArticleById = useCallback(
    (articleId: string): Article | undefined => {
      return articles.find((article) => article.id === articleId);
    },
    [articles]
  );

  /**
   * Get user questions originating from a specific article
   */
  const getQuestionsFromArticle = useCallback(
    (articleId: string) => {
      return userQuestions.filter(
        (question) => question.sourceArticleId === articleId
      );
    },
    [userQuestions]
  );

  /**
   * Get user questions leading to a specific article
   */
  const getQuestionsToArticle = useCallback(
    (articleId: string) => {
      return userQuestions.filter(
        (question) => question.destinationArticleId === articleId
      );
    },
    [userQuestions]
  );

  /**
   * Get the parent article of a given article (if any)
   */
  const getParentArticle = useCallback(
    (articleId: string): Article | undefined => {
      const incomingQuestion = userQuestions.find(
        (question) => question.destinationArticleId === articleId
      );

      if (!incomingQuestion) return undefined;

      return articles.find(
        (article) => article.id === incomingQuestion.sourceArticleId
      );
    },
    [articles, userQuestions]
  );

  /**
   * Get child articles of a given article
   */
  const getChildArticles = useCallback(
    (articleId: string): Article[] => {
      const outgoingQuestions = userQuestions.filter(
        (question) => question.sourceArticleId === articleId
      );

      return outgoingQuestions
        .map((question) =>
          articles.find(
            (article) => article.id === question.destinationArticleId
          )
        )
        .filter((article): article is Article => article !== undefined);
    },
    [articles, userQuestions]
  );

  return useMemo(
    () => ({
      // State
      personalLearningMapId,
      personalLearningMap,
      articles,
      rootArticle,
      userQuestions,
      selectedArticleId,
      isProcessingArticle,
      isLoadingMap,
      isInitialized,
      error,

      // Operations
      initialize,
      createRootArticle,
      createArticleFromQuestion,
      updateContext,
      selectArticle,
      getArticleById,
      getQuestionsFromArticle,
      getQuestionsToArticle,
      getParentArticle,
      getChildArticles,
    }),
    [
      personalLearningMapId,
      personalLearningMap,
      articles,
      rootArticle,
      userQuestions,
      selectedArticleId,
      isProcessingArticle,
      isLoadingMap,
      isInitialized,
      error,
      initialize,
      createRootArticle,
      createArticleFromQuestion,
      updateContext,
      selectArticle,
      getArticleById,
      getQuestionsFromArticle,
      getQuestionsToArticle,
      getParentArticle,
      getChildArticles,
    ]
  );
}
