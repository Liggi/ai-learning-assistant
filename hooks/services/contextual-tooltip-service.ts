import { useState, useCallback, useMemo } from "react";
import { extractBoldedSegments } from "@/utils/extractBolded";
import { Logger } from "@/lib/logger";
import { SerializedContextualTooltip } from "@/prisma/contextual-tooltips";
import { TooltipBatch } from "@/types/contextual-tooltip";
import {
  useArticleTooltips,
  useCreateTooltipBatch,
  useDeleteArticleTooltips,
  useUpdateTooltip,
} from "../api/contextual-tooltips";
import { useLocalStorage } from "../use-local-storage";
import { generate as generateTooltips } from "@/features/generators/tooltips";

// Constants
const BATCH_SIZE = 5;
const DEFAULT_CONCURRENCY_LIMIT = 3;

// Create a logger instance for the contextual tooltip service
const logger = new Logger({
  context: "ContextualTooltipService",
  enabled: true,
});

export interface TooltipContext {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export interface ContextualTooltipService {
  // State
  tooltips: SerializedContextualTooltip[];
  isGenerating: boolean;
  error: Error | null;
  isReady: boolean;
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };

  // Operations
  processArticleContent(
    articleId: string,
    content: string,
    context: TooltipContext
  ): Promise<void>;
  getTooltipForTerm(term: string): SerializedContextualTooltip | undefined;
  updateTooltip(
    id: string,
    updates: { term?: string; explanation?: string }
  ): Promise<SerializedContextualTooltip>;
  clearTooltips(articleId: string): Promise<void>;

  // State management
  resetState(): void;
}

export function useContextualTooltipService(
  articleId: string | null
): ContextualTooltipService {
  // State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  });
  const [tooltipRequestId] = useState<string>(
    `tooltip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [cachedTooltips, setCachedTooltips] = useLocalStorage<
    Record<string, string>
  >("tooltip-cache", {});

  // API hooks
  const { data: tooltips = [] } = useArticleTooltips(articleId);
  const { mutateAsync: createTooltipBatchAsync } = useCreateTooltipBatch();
  const { mutateAsync: updateTooltipAsync } = useUpdateTooltip();
  const { mutateAsync: deleteArticleTooltipsAsync } =
    useDeleteArticleTooltips();

  // Function to split concepts into batches
  const batchConcepts = useCallback((concepts: string[]): string[][] => {
    const batches: string[][] = [];
    for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
      batches.push(concepts.slice(i, i + BATCH_SIZE));
    }
    return batches;
  }, []);

  // Process article content to extract terms and generate tooltips
  const processArticleContent = useCallback(
    async (
      articleId: string,
      content: string,
      context: TooltipContext
    ): Promise<void> => {
      // Skip if no content, no articleId, already generating, or already completed
      if (!content || !articleId || isGenerating || isReady) {
        return;
      }

      try {
        setIsGenerating(true);
        setError(null);

        // Extract terms from the content
        const terms = extractBoldedSegments(content);

        // If no terms found, mark as ready and return
        if (terms.length === 0) {
          setIsReady(true);
          setIsGenerating(false);
          return;
        }

        logger.info(`Generating tooltips for ${terms.length} terms`, {
          articleId,
          requestId: tooltipRequestId,
        });

        // Create batches of terms
        const batches = batchConcepts(terms);

        // Set up progress tracking
        setProgress({
          total: terms.length,
          completed: 0,
          percentage: 0,
        });

        // Process batches with controlled concurrency
        let completedTerms = 0;
        const tooltipBatch: TooltipBatch = [];

        // Process batches in groups based on concurrency limit
        for (let i = 0; i < batches.length; i += DEFAULT_CONCURRENCY_LIMIT) {
          const batchGroup = batches.slice(i, i + DEFAULT_CONCURRENCY_LIMIT);

          // Process this group of batches concurrently
          const batchPromises = batchGroup.map(async (batch) => {
            // Filter out terms that are already in the cache
            const termsToProcess = batch.filter((term) => {
              return !cachedTooltips[term];
            });

            if (termsToProcess.length === 0) {
              return batch.map((term) => ({
                term,
                explanation: cachedTooltips[term],
              }));
            }

            try {
              // Call the tooltip generator API
              const result = await generateTooltips({
                data: {
                  concepts: termsToProcess,
                  subject: context.subject,
                  moduleTitle: context.moduleTitle,
                  moduleDescription: context.moduleDescription,
                },
              });

              const generatedTooltips = result.tooltips;

              // Update the cache with new tooltips
              setCachedTooltips((prev) => ({ ...prev, ...generatedTooltips }));

              // Return all tooltips for this batch (both cached and newly generated)
              return batch.map((term) => ({
                term,
                explanation: generatedTooltips[term] || cachedTooltips[term],
              }));
            } catch (error) {
              logger.error(`Error processing batch:`, { error, batch });
              // Return any cached results we have
              return batch
                .filter((term) => cachedTooltips[term])
                .map((term) => ({
                  term,
                  explanation: cachedTooltips[term],
                }));
            }
          });

          // Wait for all batches in this group to complete
          const batchResults = await Promise.all(batchPromises);

          // Add results to the tooltip batch
          batchResults.forEach((batchResult) => {
            tooltipBatch.push(...batchResult);
          });

          // Update progress
          const batchGroupTermCount = batchGroup.flat().length;
          completedTerms += batchGroupTermCount;
          setProgress({
            total: terms.length,
            completed: completedTerms,
            percentage: Math.round((completedTerms / terms.length) * 100),
          });
        }

        // Create tooltips in the database
        if (tooltipBatch.length > 0) {
          await createTooltipBatchAsync({
            articleId,
            tooltips: tooltipBatch,
          });
        }

        setIsGenerating(false);
        setIsReady(true);

        // Log summary
        logger.info(
          `Completed tooltip generation: ${tooltipBatch.length}/${terms.length} tooltips`,
          { articleId, requestId: tooltipRequestId }
        );
      } catch (error) {
        logger.error(`Error processing tooltips:`, { error, articleId });
        setError(error instanceof Error ? error : new Error(String(error)));
        setIsGenerating(false);
        setIsReady(true); // Mark as ready even if there was an error
      }
    },
    [
      isGenerating,
      isReady,
      batchConcepts,
      cachedTooltips,
      createTooltipBatchAsync,
      setCachedTooltips,
      tooltipRequestId,
    ]
  );

  // Get tooltip for a specific term
  const getTooltipForTerm = useCallback(
    (term: string): SerializedContextualTooltip | undefined => {
      return tooltips.find((tooltip) => tooltip.term === term);
    },
    [tooltips]
  );

  // Update a tooltip
  const updateTooltip = useCallback(
    async (
      id: string,
      updates: { term?: string; explanation?: string }
    ): Promise<SerializedContextualTooltip> => {
      try {
        return await updateTooltipAsync({ id, ...updates });
      } catch (error) {
        logger.error(`Error updating tooltip:`, { error, id });
        throw error;
      }
    },
    [updateTooltipAsync]
  );

  // Clear all tooltips for an article
  const clearTooltips = useCallback(
    async (articleId: string): Promise<void> => {
      try {
        await deleteArticleTooltipsAsync({ articleId });
        setIsReady(false);
      } catch (error) {
        logger.error(`Error clearing tooltips:`, { error, articleId });
        throw error;
      }
    },
    [deleteArticleTooltipsAsync]
  );

  // Reset state
  const resetState = useCallback(() => {
    setIsGenerating(false);
    setIsReady(false);
    setError(null);
    setProgress({
      total: 0,
      completed: 0,
      percentage: 0,
    });
  }, []);

  return {
    tooltips,
    isGenerating,
    error,
    isReady,
    progress,
    processArticleContent,
    getTooltipForTerm,
    updateTooltip,
    clearTooltips,
    resetState,
  };
}
