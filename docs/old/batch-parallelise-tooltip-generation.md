# Batching and Parallelizing Tooltip Generation

## Current Implementation Analysis

After analyzing the current tooltip generation process, I've identified the following:

1. The `useTooltipGeneration` hook extracts bolded concepts from markdown content using `extractBoldedSegments`
2. The hook is currently limiting processing to only 5 concepts for testing/debugging:
   ```typescript
   // For testing purposes, limit to max 5 concepts if there are many
   const debugMaxConcepts = 5;
   let conceptsToProcess = boldedConcepts;
   if (boldedConcepts.length > debugMaxConcepts) {
     conceptsToProcess = boldedConcepts.slice(0, debugMaxConcepts);
   }
   ```
3. All concepts are sent in a single API call to the LLM service
4. There's a 45-second timeout for the entire API call
5. If the API call fails or times out, no tooltips are shown

## Issues with Current Implementation

1. **Limited Concept Processing**: Only processing 5 concepts for debugging means many concepts don't receive tooltips
2. **Single API Call**: Sending all concepts in one call creates a single point of failure
3. **Fixed Timeout**: The 45-second timeout may be insufficient for larger batches
4. **All-or-Nothing Approach**: If the API call fails, no tooltips are shown

## Proposed Solution

We'll implement a batching and parallel processing strategy that:

1. Processes all concepts, not just the first 5
2. Splits concepts into smaller batches for parallel processing
3. Implements a progressive loading approach where tooltips appear as they become available
4. Handles failures gracefully by retrying failed batches and showing partial results

## Performance Considerations

1. **Batch Size**: Start with 8 concepts per batch, then tune based on performance metrics
2. **Concurrency Limit**: Begin with 3 concurrent API calls to avoid rate limiting
3. **Timeout Configuration**: Adjust the timeout based on batch size (smaller batches = shorter timeouts)
4. **Cache TTL**: Set a reasonable cache expiration period (e.g., 1 week) to avoid stale data

## Finding Optimal Batch Size

To determine the most efficient batch size for tooltip generation, we'll implement an adaptive batch sizing strategy:

### 1. Initial Metrics Collection Phase

First, we'll collect performance metrics for various batch sizes:

```typescript
// Store performance metrics for batch sizes
interface BatchSizeMetrics {
  batchSize: number;
  averageTimePerConcept: number; // ms per concept
  successRate: number; // 0.0 to 1.0
  totalConcepts: number;
  samples: number; // number of API calls with this batch size
}

// In the hook:
const [batchSizeMetrics, setBatchSizeMetrics] = useLocalStorage<
  Record<number, BatchSizeMetrics>
>("tooltip-batch-metrics", {});

// Track metrics for each batch execution
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
```

### 2. Adaptive Batch Size Strategy

We'll implement a system that automatically adjusts batch sizes based on historical performance:

```typescript
// In the hook:
const getOptimalBatchSize = (totalConcepts: number): number => {
  // Default to 8 if we don't have metrics yet
  if (Object.keys(batchSizeMetrics).length === 0) {
    // Try different batch sizes during the initial phase
    const exploreBatchSizes = [4, 8, 12, 16];
    return exploreBatchSizes[
      Math.floor(Math.random() * exploreBatchSizes.length)
    ];
  }

  // Find the batch size with the best balance of speed and success rate
  let bestScore = -Infinity;
  let optimalBatchSize = 8; // Default

  Object.values(batchSizeMetrics).forEach((metric) => {
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
    }
  });

  // For very small concept sets, use a smaller batch size
  if (totalConcepts <= 4) return Math.min(totalConcepts, optimalBatchSize);

  return optimalBatchSize;
};

// Use the optimal batch size
const batchSize = getOptimalBatchSize(boldedConcepts.length);
console.log(
  `[${tooltipRequestId}] Using optimal batch size of ${batchSize} for ${boldedConcepts.length} concepts`
);
const batches = batchConcepts(boldedConcepts, batchSize);
```

### 3. Performance Logging and Analysis

We'll include detailed logging to analyze performance:

```typescript
// After processing all batches
console.log(
  `[${tooltipRequestId}] Tooltip generation complete. ` +
    `Processed ${boldedConcepts.length} concepts in ${batches.length} batches. ` +
    `Batch size: ${batchSize}, Success rate: ${Object.keys(mergedTooltips).length / boldedConcepts.length}`
);

// Log current metrics for different batch sizes
console.log(
  `[${tooltipRequestId}] Current batch size metrics:`,
  batchSizeMetrics
);
```

### 4. Batch Size Boundaries

To ensure we don't try extreme batch sizes that might cause issues:

```typescript
// Constants for batch size limits
const MIN_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 20;

// When determining the optimal batch size
const constrainedBatchSize = Math.max(
  MIN_BATCH_SIZE,
  Math.min(getOptimalBatchSize(boldedConcepts.length), MAX_BATCH_SIZE)
);
```

### 5. Exponential Backoff for Failed Batches

For batches that fail, we'll implement an exponential backoff and retry strategy with smaller batch sizes:

```typescript
// In the processBatch function
const processBatchWithRetry = async (
  batchIndex: number,
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
      console.log(
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
      console.log(
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
```

By implementing this adaptive strategy, we'll:

1. Collect real-world performance data for different batch sizes
2. Automatically adjust to the most efficient batch size based on historical performance
3. Handle failures gracefully by retrying with smaller batches
4. Continuously optimize performance based on ongoing usage

This approach allows us to find the optimal batch size through empirical data rather than guessing, and it adapts to different content types and server conditions over time.

## Implementation Plan

### 1. Remove the Debugging Limitation

First, we need to remove the debug limitation that's restricting tooltip generation to only 5 concepts:

```typescript
// REMOVE this debugging limitation
// const debugMaxConcepts = 5;
// let conceptsToProcess = boldedConcepts;
// if (boldedConcepts.length > debugMaxConcepts) {
//   conceptsToProcess = boldedConcepts.slice(0, debugMaxConcepts);
// }

// Use all concepts instead
const conceptsToProcess = boldedConcepts;
```

### 2. Implement Batching Logic

Add batching logic to split concepts into manageable groups:

```typescript
// Function to split concepts into batches
const batchConcepts = (concepts: string[], batchSize = 8): string[][] => {
  const batches: string[][] = [];
  for (let i = 0; i < concepts.length; i += batchSize) {
    batches.push(concepts.slice(i, i + batchSize));
  }
  return batches;
};

// In the hook:
const batches = batchConcepts(boldedConcepts);
console.log(
  `[${tooltipRequestId}] Split ${boldedConcepts.length} concepts into ${batches.length} batches`
);
```

### 3. Implement Parallel Processing with Progressive Updates

Process batches in parallel and update the UI as tooltips become available:

```typescript
// In the hook:
const processAllBatches = async () => {
  // Create a merged tooltips object that will be progressively updated
  const mergedTooltips: Record<string, string> = {};

  // Process batches in parallel, with a concurrency limit
  const concurrencyLimit = 3; // Maximum number of concurrent API calls

  // Track which batches are being processed
  const inProgress = new Set<number>();

  // Process batches with concurrency control
  for (let i = 0; i < batches.length; i++) {
    // Wait if we've reached the concurrency limit
    while (inProgress.size >= concurrencyLimit) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Mark this batch as in progress
    inProgress.add(i);

    // Process this batch
    processBatch(i, batches[i])
      .then((batchTooltips) => {
        // Merge the results with our accumulated tooltips
        Object.assign(mergedTooltips, batchTooltips);

        // Update the state with the latest merged tooltips
        setTooltips({ ...mergedTooltips });

        // Mark this batch as no longer in progress
        inProgress.delete(i);
      })
      .catch((error) => {
        console.error(
          `[${tooltipRequestId}] Error processing batch ${i}:`,
          error
        );
        inProgress.delete(i);
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

  // Mark tooltip generation as complete
  setTooltipsReady(true);
};

// Function to process a single batch
const processBatch = async (
  batchIndex: number,
  conceptsBatch: string[]
): Promise<Record<string, string>> => {
  console.log(
    `[${tooltipRequestId}] Processing batch ${batchIndex} with ${conceptsBatch.length} concepts`
  );

  try {
    const result = await generateTooltips({
      data: {
        concepts: conceptsBatch,
        subject,
        moduleTitle,
        moduleDescription,
      },
    });

    console.log(
      `[${tooltipRequestId}] Batch ${batchIndex} completed, received ${Object.keys(result.tooltips).length} tooltips`
    );
    return result.tooltips;
  } catch (error) {
    console.error(`[${tooltipRequestId}] Batch ${batchIndex} failed:`, error);
    return {};
  }
};
```

### 4. Modify the UI to Show Partial Results

Update the `MarkdownDisplay` and `StrongText` components to handle partial tooltip results:

```typescript
// In StrongText:
const hasTooltip = tooltipText != null; // Changed from tooltipsReady && tooltipText

// Register this tooltip element for staggered animation
useEffect(() => {
  if (hasTooltip && !isRegistered.current) {
    registerTooltipElement(concept);
    isRegistered.current = true;
  }
}, [hasTooltip, concept, registerTooltipElement]);
```

### 5. Implement Caching for Tooltips

Add caching to avoid regenerating tooltips for the same concepts:

```typescript
// At the top of the file
import { useLocalStorage } from "@/hooks/use-local-storage";

// In the hook:
const [cachedTooltips, setCachedTooltips] = useLocalStorage<
  Record<string, string>
>("tooltip-cache", {});

// When processing concepts, check the cache first
const processBatch = async (
  batchIndex: number,
  conceptsBatch: string[]
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

  // If all concepts are cached, return the cached results
  if (conceptsToProcess.length === 0) {
    console.log(
      `[${tooltipRequestId}] Batch ${batchIndex} fully cached, skipping API call`
    );
    return cachedResults;
  }

  // Process the remaining concepts
  try {
    const result = await generateTooltips({
      data: {
        concepts: conceptsToProcess,
        subject,
        moduleTitle,
        moduleDescription,
      },
    });

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
```

### 6. Add a Progress Indicator

Enhance the loading state to show progress rather than a binary loading state:

```typescript
// Add to state in the hook
const [progress, setProgress] = useState({
  total: 0,
  completed: 0,
  percentage: 0,
});

// In processAllBatches, update the progress
const processAllBatches = async () => {
  // Set the total number of batches
  setProgress({ total: batches.length, completed: 0, percentage: 0 });

  // ...existing code...

  // When a batch completes
  processBatch(i, batches[i])
    .then((batchTooltips) => {
      // ...existing code...

      // Update progress
      const completed = progress.completed + 1;
      const percentage = Math.round((completed / progress.total) * 100);
      setProgress({ total: progress.total, completed, percentage });
    })
    .catch((error) => {
      // ...existing code...

      // Still update progress even on error
      const completed = progress.completed + 1;
      const percentage = Math.round((completed / progress.total) * 100);
      setProgress({ total: progress.total, completed, percentage });
    });
};

// Return progress in the hook result
return {
  tooltips,
  isGeneratingTooltips,
  tooltipsReady,
  resetTooltips,
  progress, // New progress object
};
```

## Migration Strategy

1. **First Phase**: Remove the debugging limitation and implement batching
2. **Second Phase**: Add parallel processing with progressive updates
3. **Third Phase**: Implement caching and progress indicators

## Timeline

1. **Day 1**: Remove debugging limitation and implement basic batching
2. **Day 2-3**: Implement parallel processing with progressive updates
3. **Day 4**: Add caching system
4. **Day 5**: Enhance UI with progress indicators
5. **Day 6-7**: Testing and performance tuning
