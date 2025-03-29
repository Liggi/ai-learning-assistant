import { useEffect, useRef, useState } from "react";
import { extractTakeaways } from "@/lib/article-takeaway-parser";
import { useStreamArticleContent } from "./use-stream-article-content";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import { useUpdateArticle } from "@/hooks/api/articles";
import { Logger } from "@/lib/logger";
import { generateSummary } from "@/features/generators/article-summary";
import { useQueryClient } from "@tanstack/react-query";

const logger = new Logger({ context: "useArticleContent", enabled: true });

export function useArticleContent(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject
) {
  const updateArticleMutation = useUpdateArticle();
  const [isSummaryLoading, setSummaryLoading] = useState(false);
  const queryClient = useQueryClient();

  // Track article ID changes to reset state
  const previousArticleId = useRef<string | null>(null);

  // Keep track of the last content we processed to avoid infinite loops
  const lastProcessedContent = useRef<string | null>(null);
  const summaryGenerationAttempted = useRef<boolean>(false);

  logger.debug("Hook called with article and subject", {
    articleId: article?.id,
    prevArticleId: previousArticleId.current,
    subjectId: subject?.id,
    subjectTitle: subject?.title,
    hasContent: !!article?.content,
    hasSummary: !!article?.summary,
  });

  // Reset state when article ID changes
  useEffect(() => {
    if (article?.id && previousArticleId.current !== article.id) {
      logger.info("Article ID changed in useArticleContent", {
        prevArticleId: previousArticleId.current,
        newArticleId: article.id,
      });
      // Reset all state when article ID changes
      lastProcessedContent.current = null;
      summaryGenerationAttempted.current = false;
      previousArticleId.current = article.id;
    }
  }, [article?.id]);

  const {
    content: streamedContent,
    isStreaming,
    streamComplete,
    hasExistingContent,
  } = useStreamArticleContent(article, subject.title);

  const content =
    streamedContent || (hasExistingContent ? article?.content : "");

  logger.debug("Content state", {
    hasStreamedContent: !!streamedContent,
    contentLength: content?.length || 0,
    isStreaming,
    streamComplete,
    hasExistingContent,
  });

  const effectRunCounter = useRef(0);

  const generateSummaryEffect = () => {
    effectRunCounter.current += 1;
    logger.debug("Summary effect running", {
      count: effectRunCounter.current,
      articleId: article?.id,
      hasSummary: !!article?.summary,
      isSummaryLoading,
      summaryGenerationAttempted: summaryGenerationAttempted.current,
      isStreaming,
      streamComplete,
    });

    if (
      !article?.id ||
      !content ||
      (article?.summary && article.summary.trim().length > 0) ||
      isSummaryLoading ||
      summaryGenerationAttempted.current
    ) {
      logger.debug("Skipping summary generation", {
        hasArticleId: !!article?.id,
        hasContent: !!content,
        hasSummary: !!(article?.summary && article.summary.trim().length > 0),
        isSummaryLoading,
        summaryAttempted: summaryGenerationAttempted.current,
      });
      return;
    }

    // Skip if we're still streaming content
    if (isStreaming && !streamComplete) {
      logger.debug("Deferring summary generation until streaming completes");
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
        logger.debug("Summary generation started", { articleId: article.id });

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
          stackTrace: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setSummaryLoading(false);
        logger.debug("Summary loading state reset");
      }
    };

    generateArticleSummary();
  };

  // Reset the summary generation flag when article or content changes
  useEffect(() => {
    const wasAttempted = summaryGenerationAttempted.current;
    logger.debug("Summary flag reset effect running", {
      articleId: article?.id,
      wasAttempted,
    });

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
    logger.debug("Takeaway extraction effect running", {
      articleId: article?.id,
      hasContent: !!content,
      contentLength: content?.length || 0,
      isStreaming,
      streamComplete,
      takeawaysCount: article?.takeaways?.length || 0,
    });

    // Skip all these conditions silently without logging
    if (!content || !article?.id) {
      logger.debug(
        "Skipping takeaway extraction - missing content or article ID"
      );
      return;
    }

    // Skip if we've already processed this exact content
    if (content === lastProcessedContent.current) {
      logger.debug("Skipping takeaway extraction - content already processed");
      return;
    }

    // Skip if we're still streaming (wait until complete)
    if (isStreaming && !streamComplete) {
      logger.debug("Deferring takeaway extraction until streaming completes");
      return;
    }

    // Check if we need to extract takeaways
    const hasTakeaways = article.takeaways && article.takeaways.length > 0;
    const contentChanged = content !== article.content;

    logger.debug("Takeaway status check", {
      hasTakeaways,
      contentChanged,
      currentTakeaways: article.takeaways?.length || 0,
    });

    // Only extract takeaways if we don't have them or content has changed
    if (!hasTakeaways || contentChanged) {
      // Only log when we're actually doing work
      logger.info("Extracting takeaways from content", {
        articleId: article.id,
        hasTakeaways,
        contentChanged,
      });

      const takeaways = extractTakeaways(content);

      logger.debug("Takeaway extraction result", {
        extractedCount: takeaways.length,
        firstFewTakeaways: takeaways
          .slice(0, 2)
          .map((t) => t.substring(0, 30) + "..."),
      });

      // Only update if we have takeaways to save
      if (takeaways.length > 0) {
        logger.info("Found takeaways to save", { count: takeaways.length });

        // Remember this content to avoid re-processing
        lastProcessedContent.current = content;

        // Save to database
        logger.debug("Initiating takeaway update mutation", {
          articleId: article.id,
        });
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
            onError: (error) => {
              logger.error("Failed to update takeaways", {
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                stackTrace: error instanceof Error ? error.stack : undefined,
              });
            },
          }
        );
      }
    } else {
      // Just mark as processed without logging
      lastProcessedContent.current = content;
      logger.debug("Content marked as processed without extraction", {
        alreadyHasTakeaways: hasTakeaways,
        takeawaysCount: article.takeaways?.length || 0,
      });
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
