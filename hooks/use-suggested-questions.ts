import { useState, useEffect } from "react";
import { generate as generateSuggestedQuestions } from "@/features/generators/suggested-questions";

// Logging configuration
const ENABLE_VERBOSE_LOGGING = false;
const ENABLE_TIMING_METRICS = true;

// Logging functions
const logVerbose = (message: string) => {
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(message);
  }
};

const logTiming = (message: string) => {
  if (ENABLE_TIMING_METRICS) {
    console.log(message);
  }
};

interface SuggestedQuestionsParams {
  content: string;
  isStreamingComplete: boolean;
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export function useSuggestedQuestions({
  content,
  isStreamingComplete,
  subject,
  moduleTitle,
  moduleDescription,
}: SuggestedQuestionsParams) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] =
    useState<boolean>(false);
  const [questionsReady, setQuestionsReady] = useState<boolean>(false);
  const [questionRequestId] = useState<string>(
    `question_hook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  useEffect(() => {
    // Only log state changes when there are significant changes, not just content length updates
    const hasSignificantStateChange =
      isStreamingComplete || isGeneratingQuestions || questionsReady;

    if (hasSignificantStateChange && ENABLE_VERBOSE_LOGGING) {
      logVerbose(
        `[${questionRequestId}] Questions hook state: ${JSON.stringify({
          isStreamingComplete,
          isGeneratingQuestions,
          questionsReady,
          hasContent: !!content,
          contentLength: content?.length || 0,
        })}`
      );
    }

    if (
      isStreamingComplete &&
      !isGeneratingQuestions &&
      !questionsReady &&
      content
    ) {
      logVerbose(`[${questionRequestId}] Starting question generation process`);
      const generateQuestionsForContent = async () => {
        try {
          setIsGeneratingQuestions(true);
          logVerbose(
            `[${questionRequestId}] Sending request to generate questions`
          );

          // Log request start time with a unique marker we can search for
          const startTime = Date.now();
          logTiming(
            `[${questionRequestId}] ⏱️ QUESTION_REQUEST_START: ${new Date(startTime).toISOString()}`
          );

          const suggestionsResult = await generateSuggestedQuestions({
            data: {
              subject,
              moduleTitle,
              moduleDescription,
              currentMessage: content,
            },
          });

          // Log request end time with a unique marker we can search for
          const endTime = Date.now();
          const duration = endTime - startTime;
          logTiming(
            `[${questionRequestId}] ⏱️ QUESTION_REQUEST_END: ${new Date(endTime).toISOString()}, duration: ${duration}ms`
          );

          setQuestions(suggestionsResult.suggestions);
          setQuestionsReady(true);
        } catch (error) {
          console.error(
            `[${questionRequestId}] Error generating suggested questions:`,
            error
          );
          setQuestionsReady(true); // Ensure questionsReady is set to true even if there's an error
        } finally {
          setIsGeneratingQuestions(false);
          logVerbose(
            `[${questionRequestId}] Question generation process completed`
          );
        }
      };

      generateQuestionsForContent();
    }
  }, [
    isStreamingComplete,
    content,
    subject,
    moduleTitle,
    moduleDescription,
    isGeneratingQuestions,
    questionsReady,
    questionRequestId,
  ]);

  const resetQuestions = () => {
    logVerbose(`[${questionRequestId}] Resetting questions state`);
    setQuestions([]);
    setQuestionsReady(false);
  };

  return {
    questions,
    isGeneratingQuestions,
    questionsReady,
    resetQuestions,
  };
}
