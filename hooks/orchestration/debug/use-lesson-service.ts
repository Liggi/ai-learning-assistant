import { useMemo } from "react";
import { ModuleDetails } from "@/hooks/services/use-lesson-service";
import { Logger } from "@/lib/logger";

/**
 * Debug facade for LessonService
 */
export function useLessonService() {
  // Create logger instance
  const logger = new Logger({ context: "Lesson Service (Facade)" });

  // Mock implementations
  const displayContent = "";
  const content = "";
  const isLoading = false;
  const error = null;
  const isComplete = false;

  const streamLesson = async (moduleDetails: ModuleDetails) => {
    logger.info("streamLesson called", moduleDetails);
    return { success: true };
  };

  const generateResponse = async (prompt: string, context: any) => {
    logger.info("generateResponse called", { prompt, context });
    return "This is a mock response from the lesson service.";
  };

  const onContentComplete = (callback: (content: string) => void) => {
    logger.info("onContentComplete registered");
    return () => logger.info("onContentComplete listener removed");
  };

  const resetLesson = () => {
    logger.info("resetLesson called");
  };

  // Return memoized service object
  return useMemo(
    () => ({
      displayContent,
      content,
      isLoading,
      error,
      isComplete,
      streamLesson,
      generateResponse,
      onContentComplete,
      resetLesson,
    }),
    [
      displayContent,
      content,
      isLoading,
      error,
      isComplete,
      streamLesson,
      generateResponse,
      onContentComplete,
      resetLesson,
    ]
  );
}
