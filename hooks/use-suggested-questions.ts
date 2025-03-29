import { useEffect, useRef, useState } from "react";
import { Logger } from "@/lib/logger";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import { generate } from "@/features/generators/suggested-questions";

const logger = new Logger({ context: "useSuggestedQuestions", enabled: false });

export function useSuggestedQuestions(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject,
  isStreaming: boolean,
  streamComplete: boolean,
  contentFinallyReady: boolean = false
) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);

  const questionGenerationAttempted = useRef<boolean>(false);

  useEffect(() => {
    const hasRequiredData = article?.id && article?.content;
    if (!hasRequiredData) return;

    const contentIsReady = contentFinallyReady;
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
            currentMessage: article.content,
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

        setQuestionsReady(true);
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    generateQuestions();
  }, [article?.id, article?.content, contentFinallyReady, subject.title]);

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
