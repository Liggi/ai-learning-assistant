import { useEffect, useRef, useState } from "react";
import { Logger } from "@/lib/logger";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import extractBoldFromMarkdown from "@/lib/extract-bolded-from-markdown";
import { generate } from "@/features/generators/tooltips";
import { useUpdateArticle } from "./api/articles";
import { useQueryClient } from "@tanstack/react-query";

const logger = new Logger({ context: "useContextualTooltips", enabled: true });

export function useContextualTooltips(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject,
  content: string | undefined,
  isStreaming: boolean,
  streamComplete: boolean
) {
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [isGeneratingTooltips, setIsGeneratingTooltips] = useState(false);
  const [tooltipsReady, setTooltipsReady] = useState(false);

  const queryClient = useQueryClient();

  const tooltipGenerationAttempted = useRef<boolean>(false);

  const updateArticleMutation = useUpdateArticle();

  // Main effect for generating tooltips
  useEffect(() => {
    const hasRequiredData = article?.id && content;
    if (!hasRequiredData) return;

    const contentIsReady = !isStreaming && streamComplete;
    if (!contentIsReady) return;

    if (article.tooltips && Object.keys(article.tooltips).length > 0) {
      logger.info("Tooltips already exist for this article", {
        articleId: article.id,
      });
      setTooltips(article.tooltips);
      setTooltipsReady(true);
      return;
    }

    const generationAlreadyHandled =
      isGeneratingTooltips || tooltipGenerationAttempted.current;
    if (generationAlreadyHandled) return;

    const concepts = extractBoldFromMarkdown(content);

    if (concepts.length === 0) {
      logger.info("No concepts found for tooltip generation", {
        articleId: article.id,
      });
      setTooltipsReady(true);
      tooltipGenerationAttempted.current = true;
      return;
    }

    logger.info("Generating tooltips for concepts", {
      articleId: article.id,
      concepts,
    });

    tooltipGenerationAttempted.current = true;
    setIsGeneratingTooltips(true);

    const generateTooltips = async () => {
      try {
        const result = await generate({
          data: {
            concepts,
            subject: subject.title,
          },
        });

        logger.info("Tooltip generation completed", {
          success: !!result,
          tooltipCount: Object.keys(result.tooltips).length,
        });

        updateArticleMutation.mutate(
          {
            id: article.id,
            tooltips: result.tooltips,
          },
          {
            onSuccess: () => {
              logger.info("Tooltips saved to the database", {
                articleId: article.id,
                tooltips: result.tooltips,
              });

              setTooltips(result.tooltips);
              setTooltipsReady(true);

              queryClient.invalidateQueries();
            },
          }
        );
      } catch (error) {
        logger.error("Tooltip generation failed", {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        // Set tooltipsReady to true even on failure so UI doesn't wait forever
        setTooltipsReady(true);
      } finally {
        setIsGeneratingTooltips(false);
      }
    };

    generateTooltips();
  }, [article?.id, content, isStreaming, streamComplete, subject.title]);

  // Reset tooltip generation state when the article changes
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
    isGeneratingTooltips,
    tooltipsReady,
  };
}
