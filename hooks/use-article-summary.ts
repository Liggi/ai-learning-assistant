import { useEffect, useState, useCallback } from "react";
import { SerializedArticle } from "@/types/serialized";
import { generateSummary } from "@/features/generators/article-summary";
import { useQueryClient } from "@tanstack/react-query";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "useArticleSummary", enabled: true });

type ArticleSummaryStatus =
  | "no_article"
  | "invalid_article"
  | "has_summary"
  | "generating"
  | "ready_for_generation"
  | "completed"
  | "error";
function getArticleSummaryStatus(
  article: SerializedArticle | null | undefined,
  isLoading: boolean,
  error: Error | null,
  hasCompleted: boolean
): ArticleSummaryStatus {
  if (!article) {
    logger.debug("getArticleSummaryStatus: no_article");
    return "no_article";
  }
  if (!article.id || !article.content) {
    logger.debug("getArticleSummaryStatus: invalid_article", {
      articleId: article.id,
      hasId: !!article.id,
      hasContent: !!article.content,
    });
    return "invalid_article";
  }
  if (article.summary && article.summary.trim().length > 0) {
    logger.debug("getArticleSummaryStatus: has_summary", {
      articleId: article.id,
      summaryLength: article.summary.length,
    });
    return "has_summary";
  }

  if (isLoading) {
    logger.debug("getArticleSummaryStatus: generating", {
      articleId: article.id,
    });
    return "generating";
  }

  if (error) {
    logger.debug("getArticleSummaryStatus: error", {
      articleId: article.id,
      errorMessage: error.message,
    });
    return "error";
  }

  if (hasCompleted) {
    logger.debug("getArticleSummaryStatus: completed", {
      articleId: article.id,
    });
    return "completed";
  }

  logger.debug("getArticleSummaryStatus: ready_for_generation", {
    articleId: article.id,
  });
  return "ready_for_generation";
}

/**
 * Hook to manage the generation and retrieval of an article summary.
 * Triggers summary generation if an article is provided without one.
 * Relies on React Query cache invalidation to update the summary data.
 *
 * @param article The serialized article object, or null/undefined.
 * @returns An object containing:
 *  - `data`: The article summary string, or null if unavailable/generating.
 *  - `loading`: Boolean indicating if summary generation is in progress.
 *  - `error`: An Error object if generation failed, otherwise null.
 */
export function useArticleSummary(
  article: SerializedArticle | null | undefined
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const queryClient = useQueryClient();

  const generateSummaryForArticle = useCallback(
    async (articleToProcess: SerializedArticle) => {
      if (isLoading) {
        logger.debug("Generation already in progress, skipping new trigger", {
          articleId: articleToProcess.id,
        });
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        setHasCompleted(false);
        logger.debug("Summary generation started", {
          articleId: articleToProcess.id,
        });

        const result = await generateSummary({
          data: { articleId: articleToProcess.id },
        });

        logger.info("Summary generation completed", {
          articleId: articleToProcess.id,
          success: !!result,
          summaryLength: result?.summary?.length,
        });

        queryClient.invalidateQueries();
        setHasCompleted(true);
      } catch (err) {
        const generationError =
          err instanceof Error ? err : new Error(String(err));
        logger.error("Summary generation failed", {
          articleId: articleToProcess.id,
          errorMessage: generationError.message,
          stackTrace: generationError.stack,
        });
        setError(generationError);
      } finally {
        setIsLoading(false);
        logger.debug("Summary loading state reset", {
          articleId: articleToProcess.id,
        });
      }
    },
    [isLoading, error, queryClient]
  );

  // Reset the state when the article changes
  useEffect(() => {
    setError(null);
    setHasCompleted(false);
    setIsLoading(false);
  }, [article?.id]);

  useEffect(() => {
    const status = getArticleSummaryStatus(
      article,
      isLoading,
      error,
      hasCompleted
    );
    const articleId = article?.id;

    if (
      error &&
      status !== "generating" &&
      status !== "ready_for_generation" &&
      status !== "error"
    ) {
      logger.debug("Clearing previous error as status changed", {
        articleId,
        oldError: error.message,
        newStatus: status,
      });
      setError(null);
    }

    if (status === "ready_for_generation" && article) {
      if (error) {
        logger.debug("Clearing previous error before starting generation", {
          articleId,
          oldError: error.message,
        });
        setError(null);
      }
      logger.debug("Triggering summary generation", { articleId });

      generateSummaryForArticle(article);
    } else {
      logger.debug(`Summary generation not triggered. Status: ${status}`, {
        articleId,
      });
    }
  }, [article, isLoading, generateSummaryForArticle, error, hasCompleted]);

  // For API convenience - return the summary data if we have it
  const data = article?.summary?.trim() ? article.summary : null;

  return {
    data,
    loading: isLoading,
    error,
  };
}
