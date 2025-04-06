import { useEffect, useState, useCallback } from "react";
import { SerializedArticle } from "@/types/serialized";
import { extractTakeaways } from "@/lib/article-takeaway-parser";
import { useUpdateArticle } from "@/hooks/api/articles";
import { useQueryClient } from "@tanstack/react-query";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "useArticleTakeaways", enabled: false });

type ArticleTakeawaysStatus =
  | "no_article"
  | "invalid_article"
  | "has_takeaways"
  | "generating"
  | "ready_for_extraction"
  | "completed"
  | "error";

function getArticleTakeawaysStatus(
  article: SerializedArticle | null | undefined,
  isLoading: boolean,
  error: Error | null,
  hasCompleted: boolean
): ArticleTakeawaysStatus {
  if (!article) {
    return "no_article";
  }

  if (!article.id || !article.content) {
    return "invalid_article";
  }

  if (article.takeaways && article.takeaways.length > 0) {
    return "has_takeaways";
  }

  if (isLoading) {
    return "generating";
  }

  if (error) {
    return "error";
  }

  if (hasCompleted) {
    return "completed";
  }

  return "ready_for_extraction";
}

export function useArticleTakeaways(
  article: SerializedArticle | null | undefined
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const updateArticleMutation = useUpdateArticle();
  const queryClient = useQueryClient();

  const extractTakeawaysFromArticle = useCallback(
    async (articleToProcess: SerializedArticle) => {
      if (isLoading) {
        logger.debug("Extraction already in progress, skipping new trigger", {
          articleId: articleToProcess.id,
        });
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setHasCompleted(false);
        logger.info("Extracting takeaways from content", {
          articleId: articleToProcess.id,
          contentLength: articleToProcess.content?.length || 0,
        });

        const takeaways = extractTakeaways(articleToProcess.content || "");

        if (takeaways.length > 0) {
          logger.info("Found takeaways to save", { count: takeaways.length });

          await updateArticleMutation.mutateAsync(
            {
              id: articleToProcess.id,
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
        } else {
          logger.info("No takeaways found in content");
        }

        setHasCompleted(true);
      } catch (err) {
        const extractionError =
          err instanceof Error ? err : new Error(String(err));
        logger.error("Error extracting takeaways", {
          errorMessage: extractionError.message,
          stackTrace: extractionError.stack,
        });
        setError(extractionError);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, updateArticleMutation, queryClient]
  );

  // Reset the state when the article changes
  useEffect(() => {
    setError(null);
    setHasCompleted(false);
    setIsLoading(false);
  }, [article?.id]);

  useEffect(() => {
    const status = getArticleTakeawaysStatus(
      article,
      isLoading,
      error,
      hasCompleted
    );
    const articleId = article?.id;

    if (
      error &&
      status !== "generating" &&
      status !== "ready_for_extraction" &&
      status !== "error"
    ) {
      logger.debug("Clearing previous error as status changed", {
        articleId,
        oldError: error.message,
        newStatus: status,
      });
      setError(null);
    }

    if (status === "ready_for_extraction" && article) {
      if (error) {
        logger.debug("Clearing previous error before starting extraction", {
          articleId,
          oldError: error.message,
        });
        setError(null);
      }
      logger.debug("Triggering takeaways extraction", { articleId });
      extractTakeawaysFromArticle(article);
    } else {
      logger.debug(`Takeaways extraction not triggered. Status: ${status}`, {
        articleId,
      });
    }
  }, [article, isLoading, extractTakeawaysFromArticle, error, hasCompleted]);

  // For API convenience - return the takeaways data if we have it
  const data = article?.takeaways || null;

  return {
    data,
    loading: isLoading || updateArticleMutation.isPending,
    error,
  };
}
