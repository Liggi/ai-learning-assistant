import { useState, useEffect, useCallback, useMemo } from "react";
import { generate as generateSuggestedQuestions } from "@/features/generators/suggested-questions";
import { Logger } from "@/lib/logger";

// Create a logger instance for the question service
const logger = new Logger({
  context: "QuestionService",
  enabled: true,
});

export interface QuestionContext {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export interface QuestionService {
  // State
  questions: string[];
  isGenerating: boolean;
  error: Error | null;
  isReady: boolean;

  // Operations
  processContent(content: string, context: QuestionContext): Promise<void>;
  generateQuestionsForContent(
    content: string,
    context: QuestionContext,
    requestId?: string
  ): Promise<string[]>;

  // State management
  resetQuestions(): void;
}

export function useQuestionService(): QuestionService {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [questionRequestId] = useState<string>(
    `question_service_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  // Process content and generate questions
  const processContent = async (
    content: string,
    context: QuestionContext
  ): Promise<void> => {
    if (!content || isGenerating || isReady) {
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      // Generate questions for the content
      const generatedQuestions = await generateQuestionsForContent(
        content,
        context,
        questionRequestId
      );

      // Update state with generated questions
      setQuestions(generatedQuestions);
      setIsReady(true);
      setIsGenerating(false);

      logger.info(
        `[${questionRequestId}] Generated ${generatedQuestions.length} questions successfully`
      );
    } catch (error) {
      logger.error(
        `[${questionRequestId}] Error processing content for questions:`,
        error
      );
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsGenerating(false);
      setIsReady(true); // Mark as ready even if there was an error
    }
  };

  // Generate questions for a specific content
  const generateQuestionsForContent = async (
    content: string,
    context: QuestionContext,
    requestId?: string
  ): Promise<string[]> => {
    const localRequestId =
      requestId ||
      `question_direct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // Log request start time
      const startTime = Date.now();

      // Call the API to generate questions
      const result = await generateSuggestedQuestions({
        data: {
          subject: context.subject,
          moduleTitle: context.moduleTitle,
          moduleDescription: context.moduleDescription,
          currentMessage: content,
        },
      });

      // Log request end time and duration
      const endTime = Date.now();
      const duration = endTime - startTime;

      return result.suggestions;
    } catch (error) {
      logger.error(`[${localRequestId}] Error generating questions:`, error);
      return []; // Return empty array on error
    }
  };

  /**
   * Reset questions state
   */
  const resetQuestions = useCallback(() => {
    setQuestions([]);
    setIsGenerating(false);
    setIsReady(false);
    setError(null);
  }, []);

  // Return memoized service object
  return useMemo(
    () => ({
      questions,
      isGenerating,
      isReady,
      error,
      processContent,
      generateQuestionsForContent,
      resetQuestions,
    }),
    [
      questions,
      isGenerating,
      isReady,
      error,
      processContent,
      generateQuestionsForContent,
      resetQuestions,
    ]
  );
}
