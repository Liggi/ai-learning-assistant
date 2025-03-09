import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { extractBoldedSegments } from "@/utils/extractBolded";
import { generate as generateTooltips } from "@/features/generators/tooltips";
import { useLocalStorage } from "../use-local-storage";
import { Logger } from "@/lib/logger";

// Constants
const BATCH_SIZE = 5;
const DEFAULT_CONCURRENCY_LIMIT = 3;

// Create a logger instance for the tooltip service
const logger = new Logger({
  context: "TooltipService",
  enabled: true,
});

export interface TooltipContext {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export interface TooltipService {
  // State
  tooltips: Record<string, string>;
  isGenerating: boolean;
  error: Error | null;
  isReady: boolean;
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };

  // Operations
  processContent(content: string, context: TooltipContext): Promise<void>;
  generateTooltipsForConcepts(
    concepts: string[],
    context: TooltipContext,
    requestId?: string
  ): Promise<Record<string, string>>;
  getTooltipForConcept(concept: string): string | undefined;

  // State management
  resetTooltips(): void;
}

export function useTooltipService(): TooltipService {
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [tooltipRequestId] = useState<string>(
    `tooltip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [cachedTooltips, setCachedTooltips] = useLocalStorage<
    Record<string, string>
  >("tooltip-cache", {});
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Function to split concepts into batches
  const batchConcepts = (concepts: string[]): string[][] => {
    const batches: string[][] = [];

    for (let i = 0; i < concepts.length; i += BATCH_SIZE) {
      batches.push(concepts.slice(i, i + BATCH_SIZE));
    }

    return batches;
  };

  // Process a single batch of concepts
  const processBatch = async (
    batchIndex: number | string,
    conceptsBatch: string[],
    context: TooltipContext
  ): Promise<Record<string, string>> => {
    // Filter out concepts that are already in the cache
    const cachedResults: Record<string, string> = {};
    const conceptsToProcess = conceptsBatch.filter((concept) => {
      if (concept in cachedTooltips) {
        cachedResults[concept] = cachedTooltips[concept];
        return false;
      }
      return true;
    });

    // If all concepts are cached, return the cached results immediately
    if (conceptsToProcess.length === 0) {
      return cachedResults;
    }

    try {
      // Call the API to generate tooltips
      const result = await generateTooltips({
        data: {
          concepts: conceptsToProcess,
          subject: context.subject,
          moduleTitle: context.moduleTitle,
          moduleDescription: context.moduleDescription,
        },
      });

      // Update the cache with new tooltips
      const newTooltips = { ...result.tooltips };
      setCachedTooltips((prev) => ({ ...prev, ...newTooltips }));

      // Combine cached results with new results
      return { ...cachedResults, ...newTooltips };
    } catch (error) {
      logger.error(`Error processing batch:`, error);
      return cachedResults; // Return any cached results we have
    }
  };

  // Process a batch with retry logic
  const processBatchWithRetry = async (
    batchIndex: number | string,
    conceptsBatch: string[],
    context: TooltipContext,
    retryCount = 0
  ): Promise<Record<string, string>> => {
    try {
      return await processBatch(batchIndex, conceptsBatch, context);
    } catch (error) {
      // Maximum retry attempts
      const MAX_RETRIES = 2;

      if (retryCount < MAX_RETRIES) {
        // Exponential backoff: 2^retryCount * 1000ms
        const backoffTime = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffTime));

        return processBatchWithRetry(
          batchIndex,
          conceptsBatch,
          context,
          retryCount + 1
        );
      } else {
        logger.error(`Max retries reached for batch, giving up`);
        return {}; // Return empty object after max retries
      }
    }
  };

  // Process all batches with concurrency control
  const processAllBatches = async (
    boldedConcepts: string[],
    context: TooltipContext
  ) => {
    try {
      if (boldedConcepts.length === 0) {
        setIsGenerating(false);
        setIsReady(true);
        return;
      }

      logger.info(`Generating tooltips for ${boldedConcepts.length} concepts`);

      // Create batches of concepts
      const batches = batchConcepts(boldedConcepts);

      // Set up progress tracking
      setProgress({
        total: boldedConcepts.length,
        completed: 0,
        percentage: 0,
      });

      // Process batches with controlled concurrency
      const results: Record<string, string> = {};
      let completedConcepts = 0;

      // Process batches in groups based on concurrency limit
      for (let i = 0; i < batches.length; i += DEFAULT_CONCURRENCY_LIMIT) {
        const batchGroup = batches.slice(i, i + DEFAULT_CONCURRENCY_LIMIT);

        // Process this group of batches concurrently
        const batchPromises = batchGroup.map((batch, index) =>
          processBatchWithRetry(i + index, batch, context)
        );

        // Wait for all batches in this group to complete
        const batchResults = await Promise.all(batchPromises);

        // Combine results from all batches in this group
        batchResults.forEach((batchResult) => {
          Object.assign(results, batchResult);
        });

        // Update progress
        const batchGroupConceptCount = batchGroup.flat().length;
        completedConcepts += batchGroupConceptCount;
        setProgress({
          total: boldedConcepts.length,
          completed: completedConcepts,
          percentage: Math.round(
            (completedConcepts / boldedConcepts.length) * 100
          ),
        });
      }

      // Update tooltips with all results
      setTooltips(results);
      setIsGenerating(false);
      setIsReady(true);

      // Log summary
      logger.info(
        `Completed tooltip generation: ${Object.keys(results).length}/${boldedConcepts.length} tooltips`
      );
    } catch (error) {
      logger.error(`Error processing tooltips:`, error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsGenerating(false);
      setIsReady(true); // Mark as ready even if there was an error
    }
  };

  // Process content to extract concepts and generate tooltips
  const processContent = async (
    content: string,
    context: TooltipContext
  ): Promise<void> => {
    // Skip if no content, already generating, or already completed
    if (!content || isGenerating || isReady) {
      return;
    }

    try {
      setIsGenerating(true);

      // Extract concepts from the content
      const concepts = extractBoldedSegments(content);

      // If no concepts found, mark as ready and return
      if (concepts.length === 0) {
        setIsReady(true);
        setIsGenerating(false);
        return;
      }

      // Process all batches
      await processAllBatches(concepts, context);
    } catch (error) {
      logger.error(`Error processing content:`, error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsGenerating(false);
      setIsReady(true); // Mark as ready even if there was an error
    }
  };

  // Generate tooltips for a specific set of concepts
  const generateTooltipsForConcepts = async (
    concepts: string[],
    context: TooltipContext,
    requestId?: string
  ): Promise<Record<string, string>> => {
    try {
      // Filter concepts that are already in the cache
      const cachedResults: Record<string, string> = {};
      const conceptsToProcess = concepts.filter((concept) => {
        if (concept in cachedTooltips) {
          cachedResults[concept] = cachedTooltips[concept];
          return false;
        }
        return true;
      });

      if (conceptsToProcess.length === 0) {
        return cachedResults;
      }

      // Call the API to generate tooltips
      const result = await generateTooltips({
        data: {
          concepts: conceptsToProcess,
          subject: context.subject,
          moduleTitle: context.moduleTitle,
          moduleDescription: context.moduleDescription,
        },
      });

      // Update the cache with new tooltips
      const newTooltips = { ...result.tooltips };
      setCachedTooltips((prev) => ({ ...prev, ...newTooltips }));

      // Combine cached results with new results
      return { ...cachedResults, ...newTooltips };
    } catch (error) {
      logger.error(`Error generating tooltips:`, error);
      return {}; // Return empty object on error
    }
  };

  // Get tooltip for a specific concept
  const getTooltipForConcept = (concept: string): string | undefined => {
    return tooltips[concept] || cachedTooltips[concept];
  };

  // Reset tooltips state
  const resetTooltips = useCallback(() => {
    // Reset state
    setTooltips({});
    setLastUpdated(null);
    setIsGenerating(false);
    setIsReady(false);
    setError(null);
    setProgress({
      total: 0,
      completed: 0,
      percentage: 0,
    });
  }, []);

  // Return memoized service object
  return useMemo(
    () => ({
      tooltips,
      isGenerating,
      isReady,
      error,
      progress,
      processContent,
      generateTooltipsForConcepts,
      getTooltipForConcept,
      resetTooltips,
    }),
    [
      tooltips,
      isGenerating,
      isReady,
      error,
      progress,
      processContent,
      generateTooltipsForConcepts,
      getTooltipForConcept,
      resetTooltips,
    ]
  );
}
