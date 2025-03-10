import { useState, useCallback, useMemo } from "react";
import { generate as generateSuggestedQuestionsApi } from "@/features/generators/suggested-questions";
import { Logger } from "@/lib/logger";
import {
  useUserQuestionsBySourceArticle,
  useCreateUserQuestion,
  useUpdateUserQuestion,
  useDeleteUserQuestion,
} from "@/hooks/api/user-questions";
import type { UserQuestion } from "@/types/personal-learning-map";

// Create a logger instance for the user question service
const logger = new Logger({
  context: "UserQuestionService",
  enabled: true,
});

export interface QuestionContext {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export interface UserQuestionService {
  // State
  suggestedQuestions: string[];
  userQuestions: UserQuestion[];
  isGeneratingSuggestions: boolean;
  isProcessingUserQuestion: boolean;
  error: Error | null;
  isReady: boolean;

  // Operations
  generateSuggestedQuestions(
    articleContent: string,
    context: QuestionContext,
    requestId?: string
  ): Promise<string[]>;

  createUserQuestion(
    sourceArticleId: string,
    personalLearningMapId: string,
    questionText: string,
    destinationArticleId: string,
    isImplicit?: boolean
  ): Promise<UserQuestion>;

  updateUserQuestion(id: string, text: string): Promise<UserQuestion>;

  deleteUserQuestion(
    id: string,
    metadata: {
      personalLearningMapId: string;
      sourceArticleId: string;
      destinationArticleId: string;
    }
  ): Promise<void>;

  // State management
  resetSuggestedQuestions(): void;
}

export function useUserQuestionService(
  sourceArticleId: string | null
): UserQuestionService {
  // State for suggested questions
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] =
    useState<boolean>(false);
  const [isProcessingUserQuestion, setIsProcessingUserQuestion] =
    useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [questionRequestId] = useState<string>(
    `question_service_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  // API hooks
  const { data: userQuestions = [] } =
    useUserQuestionsBySourceArticle(sourceArticleId);
  const { mutateAsync: createUserQuestionAsync } = useCreateUserQuestion();
  const { mutateAsync: updateUserQuestionAsync } = useUpdateUserQuestion();
  const { mutateAsync: deleteUserQuestionAsync } = useDeleteUserQuestion();

  /**
   * Generate suggested questions based on article content
   */
  const generateSuggestedQuestions = useCallback(
    async (
      articleContent: string,
      context: QuestionContext,
      requestId?: string
    ): Promise<string[]> => {
      const localRequestId =
        requestId ||
        `question_direct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!articleContent) {
        logger.warn(
          `[${localRequestId}] Cannot generate questions: No content provided`
        );
        return [];
      }

      try {
        setIsGeneratingSuggestions(true);
        setError(null);

        // Log request start time
        const startTime = Date.now();
        logger.info(`[${localRequestId}] Generating suggested questions`, {
          contentLength: articleContent.length,
          context,
        });

        // Call the API to generate questions
        const result = await generateSuggestedQuestionsApi({
          data: {
            subject: context.subject,
            moduleTitle: context.moduleTitle,
            moduleDescription: context.moduleDescription,
            currentMessage: articleContent,
          },
        });

        // Log request end time and duration
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.info(
          `[${localRequestId}] Generated ${result.suggestions.length} questions in ${duration}ms`
        );

        // Update state with generated questions
        setSuggestedQuestions(result.suggestions);
        setIsReady(true);

        return result.suggestions;
      } catch (error) {
        logger.error(`[${localRequestId}] Error generating questions:`, error);
        setError(error instanceof Error ? error : new Error(String(error)));
        return []; // Return empty array on error
      } finally {
        setIsGeneratingSuggestions(false);
      }
    },
    []
  );

  /**
   * Create a new user question
   */
  const createUserQuestion = useCallback(
    async (
      sourceArticleId: string,
      personalLearningMapId: string,
      questionText: string,
      destinationArticleId: string,
      isImplicit?: boolean
    ): Promise<UserQuestion> => {
      try {
        setIsProcessingUserQuestion(true);
        setError(null);

        logger.info("Creating user question", {
          sourceArticleId,
          destinationArticleId,
          personalLearningMapId,
          questionText,
          isImplicit,
        });

        const userQuestion = await createUserQuestionAsync({
          personalLearningMapId,
          sourceArticleId,
          destinationArticleId,
          text: questionText,
          isImplicit,
        });

        logger.info(`Created user question with ID: ${userQuestion.id}`);
        return userQuestion;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to create user question: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsProcessingUserQuestion(false);
      }
    },
    [createUserQuestionAsync]
  );

  /**
   * Update an existing user question
   */
  const updateUserQuestion = useCallback(
    async (id: string, text: string): Promise<UserQuestion> => {
      try {
        setIsProcessingUserQuestion(true);
        setError(null);

        logger.info(`Updating user question ${id}`, { text });

        const updatedQuestion = await updateUserQuestionAsync({
          id,
          text,
        });

        logger.info(`Updated user question ${id}`);
        return updatedQuestion;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to update user question: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsProcessingUserQuestion(false);
      }
    },
    [updateUserQuestionAsync]
  );

  /**
   * Delete a user question
   */
  const deleteUserQuestion = useCallback(
    async (
      id: string,
      metadata: {
        personalLearningMapId: string;
        sourceArticleId: string;
        destinationArticleId: string;
      }
    ): Promise<void> => {
      try {
        setIsProcessingUserQuestion(true);
        setError(null);

        logger.info(`Deleting user question ${id}`);

        await deleteUserQuestionAsync({
          id,
          personalLearningMapId: metadata.personalLearningMapId,
          sourceArticleId: metadata.sourceArticleId,
          destinationArticleId: metadata.destinationArticleId,
        });

        logger.info(`Deleted user question ${id}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to delete user question: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsProcessingUserQuestion(false);
      }
    },
    [deleteUserQuestionAsync]
  );

  /**
   * Reset suggested questions state
   */
  const resetSuggestedQuestions = useCallback(() => {
    setSuggestedQuestions([]);
    setIsGeneratingSuggestions(false);
    setIsReady(false);
    setError(null);
  }, []);

  // Return memoized service object
  return useMemo(
    () => ({
      // State
      suggestedQuestions,
      userQuestions,
      isGeneratingSuggestions,
      isProcessingUserQuestion,
      error,
      isReady,

      // Operations
      generateSuggestedQuestions,
      createUserQuestion,
      updateUserQuestion,
      deleteUserQuestion,

      // State management
      resetSuggestedQuestions,
    }),
    [
      suggestedQuestions,
      userQuestions,
      isGeneratingSuggestions,
      isProcessingUserQuestion,
      error,
      isReady,
      generateSuggestedQuestions,
      createUserQuestion,
      updateUserQuestion,
      deleteUserQuestion,
      resetSuggestedQuestions,
    ]
  );
}
