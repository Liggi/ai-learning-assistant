import { useMemo } from "react";
import {
  QuestionContext,
  QuestionService,
} from "@/hooks/services/use-question-service";
import { Logger } from "@/lib/logger";

/**
 * Debug facade for QuestionService
 */
export function useQuestionService(): QuestionService {
  // Create logger instance
  const logger = new Logger({ context: "Question Service (Facade)" });

  // Mock state
  const questions: string[] = [];
  const isGenerating = false;
  const isReady = false;
  const error = null;

  // Mock operations
  const processContent = async (
    content: string,
    context: QuestionContext
  ): Promise<void> => {
    logger.info("processContent called", {
      contentLength: content.length,
      context,
    });
  };

  const generateQuestionsForContent = async (
    content: string,
    context: QuestionContext,
    requestId?: string
  ): Promise<string[]> => {
    logger.group("generateQuestionsForContent called", () => {
      logger.info("Parameters", {
        contentLength: content.length,
        context,
        requestId,
      });
    });
    return ["Mock question 1?", "Mock question 2?", "Mock question 3?"];
  };

  // Mock state management
  const resetQuestions = () => {
    logger.info("resetQuestions called");
  };

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
