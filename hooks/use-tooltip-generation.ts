import { useState, useEffect } from "react";
import { extractBoldedSegments } from "@/utils/extractBolded";
import { generate as generateTooltips } from "@/features/generators/tooltips";
import { useLocalStorage } from "./use-local-storage";

// Constants for batch size limits
const MIN_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 20;
const DEFAULT_BATCH_SIZE = 8;
const DEFAULT_CONCURRENCY_LIMIT = 3;

// Enable/disable logging
const ENABLE_VERBOSE_LOGGING = false;
const ENABLE_METRICS_LOGGING = true;
const ENABLE_SUMMARY_METRICS = true;

const logInfo = (message: string) => {
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(message);
  }
};

// For verbose logging with multiple arguments
const logInfoVerbose = (message: string, data: any) => {
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(message, data);
  }
};

// For important metrics we always want to see
const logMetrics = (message: string) => {
  if (ENABLE_METRICS_LOGGING) {
    console.log(message);
  }
};

// For final summary metrics
const logSummaryMetrics = (message: string) => {
  if (ENABLE_SUMMARY_METRICS) {
    console.log(message);
  }
};

// Store performance metrics for batch sizes
interface BatchSizeMetrics {
  batchSize: number;
  averageTimePerConcept: number; // ms per concept
  successRate: number; // 0.0 to 1.0
  totalConcepts: number;
  samples: number; // number of API calls with this batch size
}

interface TooltipParams {
  content: string;
  isStreamingComplete: boolean;
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export function useTooltipGeneration({
  content,
  isStreamingComplete,
  subject,
  moduleTitle,
  moduleDescription,
}: TooltipParams) {
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [isGeneratingTooltips, setIsGeneratingTooltips] =
    useState<boolean>(false);
  const [tooltipsReady, setTooltipsReady] = useState<boolean>(false);
  const [tooltipRequestId] = useState<string>(
    `tooltip_hook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [cachedTooltips, setCachedTooltips] = useLocalStorage<
    Record<string, string>
  >("tooltip-cache", {});
  const [batchSizeMetrics, setBatchSizeMetrics] = useLocalStorage<
    Record<number, BatchSizeMetrics>
  >("tooltip-batch-metrics", {});
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  });

  // Function to split concepts into batches with priority first batch
  const batchConcepts = (
    concepts: string[],
    batchSize = DEFAULT_BATCH_SIZE
  ): string[][] => {
    const batches: string[][] = [];

    // Use a smaller batch size for the first batch to get it displayed quickly
    const FIRST_BATCH_SIZE = 4; // Small enough to process quickly

    if (concepts.length <= FIRST_BATCH_SIZE) {
      // If we have very few concepts, just use one batch
      batches.push(concepts);
    } else {
      // Create a small first batch for quick visual feedback
      batches.push(concepts.slice(0, FIRST_BATCH_SIZE));

      // Use the regular batch size for remaining concepts
      for (let i = FIRST_BATCH_SIZE; i < concepts.length; i += batchSize) {
        batches.push(concepts.slice(i, i + batchSize));
      }
    }

    return batches;
  };

  // Get optimal batch size based on historical metrics
  const getOptimalBatchSize = (totalConcepts: number): number => {
    // Exploration phase: Need to try different batch sizes first
    // Continue exploration until we have enough samples for at least 3 different batch sizes
    const batchSizesWithSufficientSamples = Object.values(
      batchSizeMetrics
    ).filter((metric: BatchSizeMetrics) => metric.samples >= 3).length;

    const needsMoreExploration = batchSizesWithSufficientSamples < 3;

    if (needsMoreExploration) {
      // Try different batch sizes during the exploration phase
      const exploreBatchSizes = [4, 8, 12, 16];

      // Prioritize batch sizes we haven't tried or have tried less frequently
      const batchSizeFrequency: Record<number, number> = {};
      exploreBatchSizes.forEach((size) => {
        batchSizeFrequency[size] = batchSizeMetrics[size]?.samples || 0;
      });

      // Find the least sampled batch sizes
      const minSamples = Math.min(...Object.values(batchSizeFrequency));
      const leastSampledSizes = exploreBatchSizes.filter(
        (size) => batchSizeFrequency[size] === minSamples
      );

      // Randomly select from the least sampled sizes
      const selectedSize =
        leastSampledSizes[Math.floor(Math.random() * leastSampledSizes.length)];

      logSummaryMetrics(
        `[${tooltipRequestId}] EXPLORING: Selected batch size ${selectedSize} (has ${minSamples} samples)`
      );
      return selectedSize;
    }

    // Find the batch size with the best balance of speed and success rate
    let bestScore = -Infinity;
    let optimalBatchSize = DEFAULT_BATCH_SIZE; // Default
    let bestMetrics = { time: 0, successRate: 0 };

    Object.values(batchSizeMetrics).forEach((metric: BatchSizeMetrics) => {
      // Only consider batch sizes with enough samples
      if (metric.samples < 3) return;

      // Calculate a score that balances speed and success
      // Higher score is better
      const speedScore = 1000 / metric.averageTimePerConcept; // Faster is better
      const reliabilityScore = metric.successRate * 10; // Higher success rate is better
      const score = speedScore * reliabilityScore;

      if (score > bestScore) {
        bestScore = score;
        optimalBatchSize = metric.batchSize;
        bestMetrics = {
          time: Math.round(metric.averageTimePerConcept),
          successRate: parseFloat(metric.successRate.toFixed(2)),
        };
      }
    });

    logSummaryMetrics(
      `[${tooltipRequestId}] OPTIMIZED: Selected batch size ${optimalBatchSize} (time: ${bestMetrics.time}ms, success: ${bestMetrics.successRate})`
    );

    // For very small concept sets, use a smaller batch size
    if (totalConcepts <= 4) return Math.min(totalConcepts, optimalBatchSize);

    // Constrain within our min/max limits
    return Math.max(MIN_BATCH_SIZE, Math.min(optimalBatchSize, MAX_BATCH_SIZE));
  };

  // Track performance metrics for a batch
  const trackBatchPerformance = (
    batchSize: number,
    concepts: string[],
    startTime: number,
    endTime: number,
    successCount: number
  ) => {
    const duration = endTime - startTime;
    const timePerConcept = duration / concepts.length;
    const newSuccessRate = successCount / concepts.length;

    // Update metrics
    setBatchSizeMetrics((prevMetrics) => {
      const existingMetric = prevMetrics[batchSize] || {
        batchSize,
        averageTimePerConcept: 0,
        successRate: 0,
        totalConcepts: 0,
        samples: 0,
      };

      const totalPreviousConcepts = existingMetric.totalConcepts;
      const totalNewConcepts = totalPreviousConcepts + concepts.length;

      // Weighted average for time per concept
      const newAvgTime =
        (existingMetric.averageTimePerConcept * totalPreviousConcepts +
          timePerConcept * concepts.length) /
        totalNewConcepts;

      // Weighted average for success rate
      const newAvgSuccessRate =
        (existingMetric.successRate * totalPreviousConcepts +
          newSuccessRate * concepts.length) /
        totalNewConcepts;

      // Update metrics for this batch size
      return {
        ...prevMetrics,
        [batchSize]: {
          batchSize,
          averageTimePerConcept: newAvgTime,
          successRate: newAvgSuccessRate,
          totalConcepts: totalNewConcepts,
          samples: existingMetric.samples + 1,
        },
      };
    });
  };

  // Process a single batch of concepts
  const processBatch = async (
    batchIndex: number | string,
    conceptsBatch: string[]
  ): Promise<Record<string, string>> => {
    logInfo(
      `[${tooltipRequestId}] Processing batch ${batchIndex} with ${conceptsBatch.length} concepts`
    );

    // Filter out concepts that are already in the cache
    const cachedResults: Record<string, string> = {};
    const conceptsToProcess = conceptsBatch.filter((concept) => {
      if (concept in cachedTooltips) {
        cachedResults[concept] = cachedTooltips[concept];
        return false;
      }
      return true;
    });

    // If all concepts are cached, return the cached results
    if (conceptsToProcess.length === 0) {
      logInfo(
        `[${tooltipRequestId}] Batch ${batchIndex} fully cached, skipping API call`
      );
      return cachedResults;
    }

    // Process the remaining concepts
    try {
      logInfo(
        `[${tooltipRequestId}] Sending request for batch ${batchIndex} with ${conceptsToProcess.length} concepts`
      );

      const startTime = Date.now();
      const result = await generateTooltips({
        data: {
          concepts: conceptsToProcess,
          subject,
          moduleTitle,
          moduleDescription,
        },
      });
      const endTime = Date.now();

      logInfo(
        `[${tooltipRequestId}] Batch ${batchIndex} completed in ${endTime - startTime}ms, received ${Object.keys(result.tooltips).length}/${conceptsToProcess.length} tooltips`
      );

      // Track performance metrics
      trackBatchPerformance(
        conceptsToProcess.length,
        conceptsToProcess,
        startTime,
        endTime,
        Object.keys(result.tooltips).length
      );

      // Update the cache with the new tooltips
      const newCachedTooltips = { ...cachedTooltips, ...result.tooltips };
      setCachedTooltips(newCachedTooltips);

      // Return combined results (cached + new)
      return { ...cachedResults, ...result.tooltips };
    } catch (error) {
      console.error(`[${tooltipRequestId}] Batch ${batchIndex} failed:`, error);
      return cachedResults; // Still return any cached results we have
    }
  };

  // Process batches with retry for failed ones
  const processBatchWithRetry = async (
    batchIndex: number | string,
    conceptsBatch: string[],
    retryCount = 0
  ): Promise<Record<string, string>> => {
    const maxRetries = 2;
    try {
      // Process the batch normally
      const result = await processBatch(batchIndex, conceptsBatch);

      // If successful but some concepts failed, retry with a smaller batch
      const receivedConceptsCount = Object.keys(result).length;
      if (
        receivedConceptsCount < conceptsBatch.length &&
        retryCount < maxRetries &&
        conceptsBatch.length > MIN_BATCH_SIZE
      ) {
        logInfo(
          `[${tooltipRequestId}] Batch ${batchIndex} partially failed, ` +
            `received ${receivedConceptsCount}/${conceptsBatch.length} tooltips. ` +
            `Retrying failed concepts with smaller batches.`
        );

        // Find concepts that didn't get tooltips
        const failedConcepts = conceptsBatch.filter(
          (concept) => !result[concept]
        );

        // Split the failed concepts into smaller batches
        const smallerBatchSize = Math.max(
          MIN_BATCH_SIZE,
          Math.floor(conceptsBatch.length / 2)
        );
        const retryBatches = batchConcepts(failedConcepts, smallerBatchSize);

        // Process the smaller batches and combine results
        let combinedRetryResults = { ...result };
        for (let i = 0; i < retryBatches.length; i++) {
          const retryResult = await processBatchWithRetry(
            `${batchIndex}.${i}`,
            retryBatches[i],
            retryCount + 1
          );
          combinedRetryResults = { ...combinedRetryResults, ...retryResult };
        }

        return combinedRetryResults;
      }

      return result;
    } catch (error) {
      if (retryCount < maxRetries && conceptsBatch.length > MIN_BATCH_SIZE) {
        // If batch completely failed, try with a smaller batch size
        logInfo(
          `[${tooltipRequestId}] Batch ${batchIndex} completely failed. ` +
            `Retrying with smaller batches.`
        );

        const smallerBatchSize = Math.max(
          MIN_BATCH_SIZE,
          Math.floor(conceptsBatch.length / 2)
        );
        const retryBatches = batchConcepts(conceptsBatch, smallerBatchSize);

        // Process the smaller batches and combine results
        let combinedRetryResults = {};
        for (let i = 0; i < retryBatches.length; i++) {
          const retryResult = await processBatchWithRetry(
            `${batchIndex}.${i}`,
            retryBatches[i],
            retryCount + 1
          );
          combinedRetryResults = { ...combinedRetryResults, ...retryResult };
        }

        return combinedRetryResults;
      }

      console.error(
        `[${tooltipRequestId}] Batch ${batchIndex} failed after ${retryCount} retries:`,
        error
      );
      return {};
    }
  };

  // Process all batches in parallel with concurrency control
  const processAllBatches = async (boldedConcepts: string[]) => {
    // Determine optimal batch size based on metrics
    const batchSize = getOptimalBatchSize(boldedConcepts.length);
    logSummaryMetrics(
      `[${tooltipRequestId}] OPTIMIZED: Selected batch size ${batchSize} for ${boldedConcepts.length} concepts with priority first batch`
    );

    // Split concepts into batches with the first batch containing early visual concepts
    const batches = batchConcepts(boldedConcepts, batchSize);
    const batchSizes = batches.map((b) => b.length);
    logSummaryMetrics(
      `[${tooltipRequestId}] Split ${boldedConcepts.length} concepts into ${batches.length} batches with sizes: ${batchSizes.join(", ")}`
    );

    // Set initial progress
    setProgress({ total: batches.length, completed: 0, percentage: 0 });

    // Create a merged tooltips object that will be progressively updated
    const mergedTooltips: Record<string, string> = {};

    // Process first batch immediately for fastest visual response
    try {
      logSummaryMetrics(
        `[${tooltipRequestId}] Processing first batch of ${batches[0].length} concepts immediately`
      );
      const firstBatchStart = Date.now();
      const firstBatchResults = await processBatchWithRetry(0, batches[0]);
      const firstBatchDuration = Date.now() - firstBatchStart;

      // Merge the first batch results
      Object.assign(mergedTooltips, firstBatchResults);
      setTooltips({ ...mergedTooltips });

      // Update progress
      setProgress({
        total: batches.length,
        completed: 1,
        percentage: Math.round((1 / batches.length) * 100),
      });

      logSummaryMetrics(
        `[${tooltipRequestId}] First batch completed in ${firstBatchDuration}ms, starting remaining batches`
      );
    } catch (error) {
      console.error(
        `[${tooltipRequestId}] Error processing first batch:`,
        error
      );
      // Continue with remaining batches even if first batch fails
    }

    // Skip the first batch in the parallel processing since we already processed it
    const remainingBatches = batches.slice(1);
    if (remainingBatches.length === 0) {
      // If there are no remaining batches, we're done
      logSummaryMetrics(
        `[${tooltipRequestId}] No remaining batches to process`
      );
      return;
    }

    // Process batches in parallel, with a concurrency limit
    const concurrencyLimit = DEFAULT_CONCURRENCY_LIMIT;

    // Track which batches are being processed
    const inProgress = new Set<number>();

    // Process remaining batches with concurrency control
    for (let i = 0; i < remainingBatches.length; i++) {
      // Wait if we've reached the concurrency limit
      while (inProgress.size >= concurrencyLimit) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Mark this batch as in progress
      inProgress.add(i);

      // Process this batch
      processBatchWithRetry(i + 1, remainingBatches[i])
        .then((batchTooltips) => {
          // Merge the results with our accumulated tooltips
          Object.assign(mergedTooltips, batchTooltips);

          // Update the state with the latest merged tooltips
          setTooltips({ ...mergedTooltips });

          // Mark this batch as no longer in progress
          inProgress.delete(i);

          // Update progress
          const completed = progress.completed + 1;
          const percentage = Math.round((completed / progress.total) * 100);
          setProgress({ total: progress.total, completed, percentage });
        })
        .catch((error) => {
          console.error(
            `[${tooltipRequestId}] Error processing batch ${i + 1}:`,
            error
          );
          inProgress.delete(i);

          // Update progress even on error
          const completed = progress.completed + 1;
          const percentage = Math.round((completed / progress.total) * 100);
          setProgress({ total: progress.total, completed, percentage });
        });

      // Small delay between starting batches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Wait for all batches to complete
    while (inProgress.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Final update to ensure all tooltips are included
    setTooltips({ ...mergedTooltips });

    // Calculate success rate with formatting
    const successRate = (
      Object.keys(mergedTooltips).length / boldedConcepts.length
    ).toFixed(2);

    // Log performance metrics - these are important so we keep them
    logSummaryMetrics(
      `[${tooltipRequestId}] Complete: ${boldedConcepts.length} concepts, batch size: ${batchSize}, success: ${successRate}`
    );

    // Format batch metrics more concisely for logging
    const formattedMetrics = Object.values(batchSizeMetrics)
      .map((metric) => ({
        size: metric.batchSize,
        time: Math.round(metric.averageTimePerConcept),
        success: parseFloat(metric.successRate.toFixed(2)),
        samples: metric.samples,
      }))
      .filter((m) => m.samples > 0)
      .sort((a, b) => a.size - b.size);

    // Log detailed batch metrics - these are important so we keep them
    logSummaryMetrics(
      `[${tooltipRequestId}] METRICS: ${JSON.stringify(formattedMetrics)}`
    );

    // Log accumulated metrics from localStorage for visibility
    const accumulatedMetrics = getFormattedMetrics();
    logSummaryMetrics(
      `[${tooltipRequestId}] ACCUMULATED: ${JSON.stringify(accumulatedMetrics)}`
    );

    // Mark tooltip generation as complete
    setTooltipsReady(true);
  };

  useEffect(() => {
    logInfoVerbose(`[${tooltipRequestId}] Tooltip hook state:`, {
      isStreamingComplete,
      isGeneratingTooltips,
      tooltipsReady,
      hasContent: !!content,
      contentLength: content?.length || 0,
    });

    if (
      isStreamingComplete &&
      !isGeneratingTooltips &&
      !tooltipsReady &&
      content
    ) {
      logInfo(`[${tooltipRequestId}] Starting tooltip generation process`);
      const generateTooltipsForContent = async () => {
        try {
          setIsGeneratingTooltips(true);
          const boldedConcepts = extractBoldedSegments(content);

          if (boldedConcepts.length > 0) {
            // Process all concepts, no longer limiting to just 5
            await processAllBatches(boldedConcepts);
          } else {
            setTooltipsReady(true);
          }
        } catch (error) {
          console.error(
            `[${tooltipRequestId}] Error generating tooltips:`,
            error
          );
          setTooltipsReady(true); // Ensure tooltipsReady is set to true even if there's an error
        } finally {
          setIsGeneratingTooltips(false);
        }
      };

      generateTooltipsForContent();
    }
  }, [
    isStreamingComplete,
    content,
    subject,
    moduleTitle,
    moduleDescription,
    isGeneratingTooltips,
    tooltipsReady,
    tooltipRequestId,
  ]);

  const resetTooltips = () => {
    logInfo(`[${tooltipRequestId}] Resetting tooltips state`);
    setTooltips({});
    setTooltipsReady(false);
    setProgress({ total: 0, completed: 0, percentage: 0 });
  };

  // Utility function to reset all accumulated metrics data
  const resetBatchMetrics = () => {
    setBatchSizeMetrics({});
    logSummaryMetrics(`[${tooltipRequestId}] Batch metrics have been reset`);
  };

  // Utility function to get current metrics in a formatted way
  const getFormattedMetrics = () => {
    return Object.values(batchSizeMetrics)
      .map((metric) => ({
        size: metric.batchSize,
        time: Math.round(metric.averageTimePerConcept),
        success: parseFloat(metric.successRate.toFixed(2)),
        samples: metric.samples,
      }))
      .filter((m) => m.samples > 0)
      .sort((a, b) => a.size - b.size);
  };

  return {
    tooltips,
    isGeneratingTooltips,
    tooltipsReady,
    resetTooltips,
    progress,
    // Expose metrics-related utilities
    resetBatchMetrics,
    batchMetrics: getFormattedMetrics(),
  };
}
