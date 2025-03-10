import { useState, useCallback, useRef, useEffect } from "react";
import {
  useArticle,
  useCreateArticle,
  useUpdateArticle,
} from "@/hooks/api/articles";
import { generate } from "@/features/generators/lesson";
import { Logger } from "@/lib/logger";
import type { Article } from "@/types/personal-learning-map";

// Create a logger instance for the article service
const logger = new Logger({ context: "ArticleService" });

// Request tracking for deduplication
const pendingRequests = new Map<string, Promise<any>>();
const recentRequests = new Map<string, { timestamp: number; result: any }>();
const REQUEST_CACHE_TTL = 30000; // 30 seconds
const DEDUPLICATION_WINDOW = 5000; // 5 seconds

/**
 * Creates a unique request ID based on the input parameters
 */
function createRequestId(type: string, data: any): string {
  return `${type}:${JSON.stringify(data)}`;
}

/**
 * Interface for module details used to generate article content
 */
export interface ModuleDetails {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
  message: string;
}

/**
 * ArticleService hook for managing article generation and content
 * Replaces the previous lesson service with the new domain model
 */
export function useArticleService() {
  // State
  const [articleId, setArticleId] = useState<string | null>(null);
  const [displayContent, setDisplayContent] = useState<string>(""); // For UI updates
  const [content, setContent] = useState<string>(""); // For service integration - only updates when complete
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isStreamingStarted, setIsStreamingStarted] = useState<boolean>(false);
  const [isArticleReady, setIsArticleReady] = useState<boolean>(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentListenersRef = useRef<Set<(content: string) => void>>(new Set());

  // Throttle ref for UI updates
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const THROTTLE_INTERVAL = 150; // Only update UI every 150ms during streaming

  // API hooks
  const { data: article } = useArticle(articleId);
  const { mutateAsync: createArticleAsync } = useCreateArticle();
  const { mutateAsync: updateArticleAsync } = useUpdateArticle();

  // Cleanup old requests periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of recentRequests.entries()) {
        if (now - value.timestamp > REQUEST_CACHE_TTL) {
          recentRequests.delete(key);
        }
      }
    }, 60000); // Run cleanup every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  /**
   * Generate article content based on module details with deduplication
   */
  const generateArticleContent = useCallback(
    async (moduleDetails: ModuleDetails): Promise<string> => {
      try {
        // Generate a unique request ID
        const requestId = createRequestId("article", moduleDetails);

        // Check if we have a recent result for this exact request
        const cachedRequest = recentRequests.get(requestId);
        if (cachedRequest) {
          const timeSinceRequest = Date.now() - cachedRequest.timestamp;
          if (timeSinceRequest < DEDUPLICATION_WINDOW) {
            logger.info(
              `Returning cached article content for request ${requestId} (${timeSinceRequest}ms old)`
            );
            return cachedRequest.result;
          }
        }

        // Check if this exact request is already in progress
        const pendingRequest = pendingRequests.get(requestId);
        if (pendingRequest) {
          logger.info(`Reusing pending request for ${requestId}`);
          return pendingRequest;
        }

        logger.info(
          `Generating article content for module: ${moduleDetails.moduleTitle}`
        );

        // Create a promise for this request and store it
        const requestPromise = (async () => {
          try {
            // Call the lesson generator with the module details
            const result = await generate({
              data: moduleDetails,
            });

            // Cache the result for future duplicate requests
            recentRequests.set(requestId, {
              timestamp: Date.now(),
              result: result.response,
            });

            logger.info("Article content generation completed successfully");
            return result.response;
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error(`Error generating article content: ${error.message}`);
            throw error;
          } finally {
            // Remove this request from pending requests
            pendingRequests.delete(requestId);
          }
        })();

        // Store the promise
        pendingRequests.set(requestId, requestPromise);

        // Wait for it to complete
        return await requestPromise;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Error in generateArticleContent: ${error.message}`);
        throw error;
      }
    },
    []
  );

  /**
   * Stream article content with progressive UI updates
   */
  const streamArticleContent = useCallback(
    async (moduleDetails: ModuleDetails): Promise<void> => {
      try {
        // Set streaming started flag
        setIsStreamingStarted(true);

        // Reset state
        setDisplayContent("");
        setContent("");
        setError(null);
        setIsComplete(false);
        setIsArticleReady(false);
        setIsLoading(true);

        // Abort any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Make a fetch request to our streaming API route
        const response = await fetch("/api/article-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(moduleDetails),
          signal,
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        let resultContent = "";

        // Handle streaming response
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            // Check if the request has been aborted
            if (signal.aborted) {
              reader.cancel();
              break;
            }

            const { value, done } = await reader.read();
            if (done) {
              // When done, update both display content and service content
              setDisplayContent(resultContent);
              setContent(resultContent); // THIS is where we update other services
              setIsComplete(true);
              setIsArticleReady(true);

              // Notify listeners that content is complete
              contentListenersRef.current.forEach((callback) =>
                callback(resultContent)
              );
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            resultContent += chunk;

            // Throttle UI updates during streaming to reduce re-renders
            const now = Date.now();
            if (now - lastUpdateTimeRef.current >= THROTTLE_INTERVAL) {
              setDisplayContent(resultContent); // Only update the display content during streaming
              lastUpdateTimeRef.current = now;
            } else {
              // Schedule a throttled update if we don't have one already
              if (!throttleTimerRef.current) {
                throttleTimerRef.current = setTimeout(() => {
                  setDisplayContent(resultContent);
                  lastUpdateTimeRef.current = Date.now();
                  throttleTimerRef.current = null;
                }, THROTTLE_INTERVAL);
              }
            }
          }

          // Ensure we get the last bits
          const lastChunk = decoder.decode();
          if (lastChunk) {
            resultContent += lastChunk;
            setDisplayContent(resultContent);
            setContent(resultContent); // Also update service content with final content
          }
        }

        logger.info("Article streaming completed successfully");
      } catch (err) {
        // Only set error if the request wasn't aborted
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.error(`Error streaming article: ${error.message}`);
          setError(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new article with the given content
   */
  const createArticle = useCallback(
    async (
      personalLearningMapId: string,
      content: string,
      isRoot: boolean = false
    ): Promise<Article> => {
      try {
        logger.info("Creating new article", {
          personalLearningMapId,
          isRoot,
        });

        const article = await createArticleAsync({
          personalLearningMapId,
          content,
          isRoot,
        });

        logger.info(`Created article with ID: ${article.id}`);
        setArticleId(article.id);
        return article;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Error creating article: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    [createArticleAsync]
  );

  /**
   * Update an existing article with new content
   */
  const updateArticle = useCallback(
    async (id: string, content: string): Promise<Article> => {
      try {
        logger.info(`Updating article with ID: ${id}`);

        const article = await updateArticleAsync({
          id,
          content,
        });

        logger.info(`Updated article with ID: ${article.id}`);
        return article;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Error updating article: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    [updateArticleAsync]
  );

  /**
   * Set the current article ID
   */
  const setCurrentArticle = useCallback((id: string | null) => {
    setArticleId(id);
  }, []);

  /**
   * Register a listener for content updates
   */
  const registerContentListener = useCallback(
    (callback: (content: string) => void) => {
      contentListenersRef.current.add(callback);
      // If content is already available, call the callback immediately
      if (content) {
        callback(content);
      }
      return () => {
        contentListenersRef.current.delete(callback);
      };
    },
    [content]
  );

  /**
   * Cancel the current streaming operation
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      logger.info("Cancelling article streaming");
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    article,
    articleId,
    displayContent,
    content,
    isLoading,
    error,
    isComplete,
    isStreamingStarted,
    isArticleReady,

    // Operations
    generateArticleContent,
    streamArticleContent,
    createArticle,
    updateArticle,
    setCurrentArticle,
    registerContentListener,
    cancelStreaming,
  };
}
