import { useEffect, useRef, useState } from "react";
import { extractTakeaways } from "@/lib/article-takeaway-parser";
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

  const content = article?.content || "";

  const generateSummaryEffect = () => {
    if (
      !article?.id ||
      !content ||
      (article?.summary && article.summary.trim().length > 0) ||
      isSummaryLoading
    ) {
      logger.debug("Skipping summary generation", {
        hasArticleId: !!article?.id,
        hasContent: !!content,
        hasSummary: !!(article?.summary && article.summary.trim().length > 0),
        isSummaryLoading,
      });
      return;
    }

    // Only log when we're actually going to generate a summary
    logger.info("Starting summary generation", {
      articleId: article.id,
      contentLength: content.length,
    });

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

  useEffect(() => {
    logger.debug("Takeaway extraction effect running", {
      articleId: article?.id,
      hasContent: !!content,
      contentLength: content?.length || 0,
      takeawaysCount: article?.takeaways?.length || 0,
    });

    if (!content || !article?.id) {
      logger.debug(
        "Skipping takeaway extraction - missing content or article ID"
      );
      return;
    }

    const hasTakeaways = article.takeaways && article.takeaways.length > 0;
    if (!hasTakeaways) {
      logger.info("Extracting takeaways from content", {
        articleId: article.id,
        hasTakeaways,
      });

      const takeaways = extractTakeaways(content);

      // Only update if we have takeaways to save
      if (takeaways.length > 0) {
        logger.info("Found takeaways to save", { count: takeaways.length });

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
    }
  }, [
    article?.id,
    article?.takeaways,
    content,
    updateArticleMutation,
    queryClient,
    subject.id,
  ]);

  return {
    content,
    isSummaryLoading,
    isStreaming: false,
    streamComplete: false,
    contentFinallyReady: false,
  };
}
