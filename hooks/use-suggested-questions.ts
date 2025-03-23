import { useEffect, useRef, useState } from "react";
import { Logger } from "@/lib/logger";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import { generate } from "@/features/generators/suggested-questions";

const logger = new Logger({ context: "useSuggestedQuestions", enabled: true });

export function useSuggestedQuestions(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject,
  content: string | undefined,
  isStreaming: boolean,
  streamComplete: boolean
) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);

  const questionGenerationAttempted = useRef<boolean>(false);

  // Main effect for generating questions
  useEffect(() => {
    const hasRequiredData = article?.id && content;
    if (!hasRequiredData) return;

    const contentIsReady = !isStreaming && streamComplete;
    if (!contentIsReady) return;

    const generationAlreadyHandled =
      isGeneratingQuestions || questionGenerationAttempted.current;
    if (generationAlreadyHandled) return;

    logger.info("Generating suggested questions", {
      articleId: article.id,
    });

    questionGenerationAttempted.current = true;
    setIsGeneratingQuestions(true);

    const generateQuestions = async () => {
      try {
        const result = await generate({
          data: {
            subject: subject.title,
            currentMessage: content,
          },
        });

        logger.info("Question generation completed", {
          success: !!result,
          questionCount: result.suggestions.length,
        });

        setQuestions(result.suggestions);
        setQuestionsReady(true);
      } catch (error) {
        logger.error("Question generation failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        // Set questionsReady to true even on failure so UI doesn't wait forever
        setQuestionsReady(true);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    generateQuestions();
  }, [article?.id, content, isStreaming, streamComplete, subject.title]);

  // Reset question generation state when the article changes
  useEffect(() => {
    if (questionGenerationAttempted.current) {
      logger.info("Resetting question generation state", {
        articleId: article?.id,
      });
      questionGenerationAttempted.current = false;
      setQuestions([]);
      setQuestionsReady(false);
    }
  }, [article?.id]);

  return {
    questions,
    isGeneratingQuestions,
    questionsReady,
  };
}
