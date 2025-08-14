import { useEffect, useRef, useState } from "react";
import { generate } from "@/features/generators/suggested-questions";
import { Logger } from "@/lib/logger";
import type { SerializedArticle, SerializedSubject } from "@/types/serialized";

const logger = new Logger({ context: "useSuggestedQuestions", enabled: false });

export function useSuggestedQuestions(
  subject: SerializedSubject,
  article: SerializedArticle | null | undefined
) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const questionGenerationAttempted = useRef<boolean>(false);

  useEffect(() => {
    const hasRequiredData = article?.id && article?.content;
    if (!hasRequiredData) return;

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
      } catch (error) {
        logger.error("Question generation failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    generateQuestions();
  }, [article?.id, article?.content, subject.title]);

  // Reset question generation state when the article changes
  useEffect(() => {
    if (questionGenerationAttempted.current) {
      logger.info("Resetting question generation state", {
        articleId: article?.id,
      });
      questionGenerationAttempted.current = false;
      setQuestions([]);
    }
  }, [article?.id]);

  return {
    questions,
    isGeneratingQuestions,
  };
}
