import { useEffect, useRef, useState } from "react";
import { extractTakeaways } from "@/lib/article-takeaway-parser";
import {
  useStreamArticleContent,
  QuestionContext,
} from "./use-stream-article-content";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import { useUpdateArticle } from "@/hooks/api/articles";
import { Logger } from "@/lib/logger";
import { generateSummary } from "@/features/generators/article-summary";
import { useQueryClient } from "@tanstack/react-query";

const logger = new Logger({ context: "useArticleContent", enabled: true });

export function useArticleContent(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject,
  questionContext?: QuestionContext
) {
  const updateArticleMutation = useUpdateArticle();
  const [isSummaryLoading, setSummaryLoading] = useState(false);
  const queryClient = useQueryClient();

  // Keep track of the last content we processed to avoid infinite loops
  const lastProcessedContent = useRef<string | null>(null);
  const summaryGenerationAttempted = useRef<boolean>(false);

  const {
    content: streamedContent,
    isStreaming,
    streamComplete,
    hasExistingContent,
  } = useStreamArticleContent(article, subject.title, questionContext);

  const content =
    streamedContent || (hasExistingContent ? article?.content : "");

  const effectRunCounter = useRef(0);

  const generateSummaryEffect = () => {
    if (
      !article?.id ||
      !content ||
      (article?.summary && article.summary.trim().length > 0) ||
      isSummaryLoading ||
      summaryGenerationAttempted.current
    ) {
      return;
    }

    // Skip if we're still streaming content
    if (isStreaming && !streamComplete) {
      return;
    }

    // Only log when we're actually going to generate a summary
    logger.info("Starting summary generation", {
      articleId: article.id,
      contentLength: content.length,
    });

    // Mark that we've attempted summary generation for this content
    summaryGenerationAttempted.current = true;

    const generateArticleSummary = async () => {
      try {
        setSummaryLoading(true);

        const result = await generateSummary({
          data: { articleId: article.id },
        });

        logger.info("Summary generation completed", {
          success: !!result,
          summaryLength: result?.summary?.length,
        });

        queryClient.invalidateQueries();
      } catch (error) {
        logger.error("Summary generation failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setSummaryLoading(false);
      }
    };

    generateArticleSummary();
  };

  // Reset the summary generation flag when article or content changes
  useEffect(() => {
    // Only log if we're actually resetting the flag
    if (summaryGenerationAttempted.current) {
      logger.info("Resetting summary generation flag", {
        articleId: article?.id,
      });
      summaryGenerationAttempted.current = false;
    } else {
      // Silently reset without logging
      summaryGenerationAttempted.current = false;
    }
  }, [article?.id, content]);

  useEffect(generateSummaryEffect, [
    article?.id,
    article?.learningMapId,
    article?.summary,
    content,
    isStreaming,
    streamComplete,
    isSummaryLoading,
  ]);

  // Process content to extract takeaways whenever content changes or streaming completes
  useEffect(() => {
    // Skip all these conditions silently without logging
    if (!content || !article?.id) {
      return;
    }

    // Skip if we've already processed this exact content
    if (content === lastProcessedContent.current) {
      return;
    }

    // Skip if we're still streaming (wait until complete)
    if (isStreaming && !streamComplete) {
      return;
    }

    // Check if we need to extract takeaways
    const hasTakeaways = article.takeaways && article.takeaways.length > 0;
    const contentChanged = content !== article.content;

    // Only extract takeaways if we don't have them or content has changed
    if (!hasTakeaways || contentChanged) {
      // Only log when we're actually doing work
      logger.info("Extracting takeaways from content", {
        articleId: article.id,
        hasTakeaways,
        contentChanged,
      });

      const takeaways = extractTakeaways(content);

      // Only update if we have takeaways to save
      if (takeaways.length > 0) {
        logger.info("Found takeaways to save", { count: takeaways.length });

        // Remember this content to avoid re-processing
        lastProcessedContent.current = content;

        // Save to database
        updateArticleMutation.mutate(
          {
            id: article.id,
            takeaways,
          },
          {
            onSuccess: () => {
              logger.info(
                "Successfully updated takeaways and invalidating queries"
              );
              queryClient.invalidateQueries();
            },
          }
        );
      }
    } else {
      // Just mark as processed without logging
      lastProcessedContent.current = content;
    }
  }, [
    content,
    streamComplete,
    isStreaming,
    article?.id,
    article?.content,
    article?.takeaways,
    updateArticleMutation,
    queryClient,
    subject.id,
  ]);

  return {
    content,
    isStreaming,
    streamComplete,
    hasExistingContent,
    isSummaryLoading,
  };
}
