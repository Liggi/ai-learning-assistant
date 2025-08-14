import { useEffect, useRef, useState } from "react";
import { Logger } from "@/lib/logger";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import extractBoldFromMarkdown from "@/lib/extract-bolded-from-markdown";
import { generate } from "@/features/generators/tooltips";
import { useUpdateArticle } from "./api/articles";
import { useQueryClient } from "@tanstack/react-query";

const logger = new Logger({ context: "useContextualTooltips", enabled: false });

export function useContextualTooltips(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject
) {
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [tooltipsReady, setTooltipsReady] = useState(false);

  const queryClient = useQueryClient();

  const tooltipGenerationAttempted = useRef<boolean>(false);

  const updateArticleMutation = useUpdateArticle();

  useEffect(() => {
    const hasRequiredData = article?.id && article.content;
    if (!hasRequiredData) {
      logger.debug("Missing required data for tooltip generation");
      return;
    }

    if (tooltipGenerationAttempted.current) {
      logger.debug("Tooltip generation already attempted", {
        tooltipGenerationAttempted: tooltipGenerationAttempted.current,
      });
      return;
    }

    // Skip if tooltips already exist for this article
    if (article.tooltips && Object.keys(article.tooltips).length > 0) {
      setTooltips(article.tooltips);
      setTooltipsReady(true);
      return;
    }

    const boldedTerms = extractBoldFromMarkdown(article.content);
    if (boldedTerms.length === 0) {
      logger.info("No bolded terms found in content");
      setTooltipsReady(true);
      return;
    }


    tooltipGenerationAttempted.current = true;

    const generateTooltips = async () => {
      try {
        const result = await generate({
          data: {
            concepts: boldedTerms,
            subject: subject.title,
            articleContent: article.content,
          },
        });

        if (!result || !result.tooltips) {
          throw new Error("No tooltips returned from generation");
        }

        logger.info("Tooltip generation completed", {
          termCount: Object.keys(result.tooltips).length,
          terms: Object.keys(result.tooltips).join(", "),
        });

        setTooltips(result.tooltips);
        setTooltipsReady(true);

        updateArticleMutation.mutateAsync({
          id: article.id,
          tooltips: result.tooltips,
        }).catch((dbError) => {
          logger.error("Failed to save tooltips to database", {
            errorMessage: dbError instanceof Error ? dbError.message : String(dbError),
          });
        });
      } catch (error) {
        logger.error("Tooltip generation failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        setTooltipsReady(true);
      }
    };

    generateTooltips();
  }, [
    article?.id,
    article?.content,
    subject.title,
    updateArticleMutation,
    queryClient,
  ]);

  useEffect(() => {
    if (tooltipGenerationAttempted.current) {
      logger.info("Resetting tooltip generation state", {
        articleId: article?.id,
      });
      tooltipGenerationAttempted.current = false;
      setTooltips({});
      setTooltipsReady(false);
    }
  }, [article?.id]);

  return {
    tooltips,
    tooltipsReady,
  };
}
