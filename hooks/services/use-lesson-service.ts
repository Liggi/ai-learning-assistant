import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Logger } from "@/lib/logger";

// Create a logger instance for the lesson service
const logger = new Logger({ context: "LessonService", enabled: true });

// Module details interface
export interface ModuleDetails {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
  message: string;
}

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
 * LessonService hook for managing lesson streaming and response generation
 * Implements the interface defined in the implementation plan
 */
export function useLessonService() {
  // State
  const [displayContent, setDisplayContent] = useState<string>(""); // For UI updates
  const [content, setContent] = useState<string>(""); // For service integration - only updates when complete
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isStreamingStarted, setIsStreamingStarted] = useState<boolean>(false);
  const [isLessonReady, setIsLessonReady] = useState<boolean>(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentListenersRef = useRef<Set<(content: string) => void>>(new Set());

  // Throttle ref for UI updates
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const THROTTLE_INTERVAL = 150; // Only update UI every 150ms during streaming

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
   * Stream a lesson based on module details with deduplication
   */
  const streamLesson = useCallback(
    async (moduleDetails: ModuleDetails): Promise<void> => {
      try {
        // Set streaming started flag
        setIsStreamingStarted(true);

        // Generate a unique request ID
        const requestId = createRequestId("lesson", moduleDetails);

        // Check if we have a recent result for this exact request
        const cachedRequest = recentRequests.get(requestId);
        if (cachedRequest) {
          const timeSinceRequest = Date.now() - cachedRequest.timestamp;
          if (timeSinceRequest < DEDUPLICATION_WINDOW) {
            logger.info(
              `Returning cached lesson for request ${requestId} (${timeSinceRequest}ms old)`
            );
            setDisplayContent(cachedRequest.result);
            setContent(cachedRequest.result); // Also update service content
            setIsComplete(true);
            setIsLessonReady(true);
            return;
          }
        }

        // Check if this exact request is already in progress
        const pendingRequest = pendingRequests.get(requestId);
        if (pendingRequest) {
          logger.info(`Reusing pending request for ${requestId}`);
          await pendingRequest;
          return;
        }

        // Reset state
        setDisplayContent("");
        setContent("");
        setError(null);
        setIsComplete(false);
        setIsLessonReady(false);
        setIsLoading(true);

        logger.info(
          `Streaming lesson for module: ${moduleDetails.moduleTitle}`
        );

        // Abort any existing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        // Create a promise for this request and store it
        const requestPromise = (async () => {
          let resultContent = "";

          try {
            // Make a fetch request to our streaming API route
            const response = await fetch("/api/lesson-stream", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(moduleDetails),
              signal,
            });

            if (!response.ok) {
              throw new Error(
                `Error: ${response.status} ${response.statusText}`
              );
            }

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
                  setIsLessonReady(true);

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

              // Cache the result for future duplicate requests
              recentRequests.set(requestId, {
                timestamp: Date.now(),
                result: resultContent,
              });
            }

            logger.info("Lesson streaming completed successfully");
            return resultContent;
          } catch (err) {
            // Only set error if the request wasn't aborted
            if (!(err instanceof DOMException && err.name === "AbortError")) {
              const error = err instanceof Error ? err : new Error(String(err));
              logger.error(`Error streaming lesson: ${error.message}`);
              setError(error);
              throw error;
            }
          } finally {
            // Remove this request from pending requests
            pendingRequests.delete(requestId);
            setIsLoading(false);
          }
        })();

        // Store the promise
        pendingRequests.set(requestId, requestPromise);

        // Wait for it to complete
        await requestPromise;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Error in streamLesson wrapper: ${error.message}`);
        setError(error);
      }
    },
    []
  );

  /**
   * Generate a response to a prompt with deduplication
   */
  const generateResponse = useCallback(
    async (prompt: string, requestId?: string): Promise<string> => {
      try {
        // Generate a unique request ID if one wasn't provided
        const uniqueRequestId =
          requestId || createRequestId("response", prompt);

        // Check if we have a recent result for this exact request
        const cachedRequest = recentRequests.get(uniqueRequestId);
        if (cachedRequest) {
          const timeSinceRequest = Date.now() - cachedRequest.timestamp;
          if (timeSinceRequest < DEDUPLICATION_WINDOW) {
            logger.info(
              `Returning cached response for request ${uniqueRequestId} (${timeSinceRequest}ms old)`
            );
            return cachedRequest.result;
          }
        }

        // Check if this exact request is already in progress
        const pendingRequest = pendingRequests.get(uniqueRequestId);
        if (pendingRequest) {
          logger.info(`Reusing pending request for ${uniqueRequestId}`);
          return pendingRequest;
        }

        logger.info(
          `Generating response to prompt (request ID: ${uniqueRequestId})`
        );
        setIsLoading(true);

        // Create a new AbortController for this request
        const controller = new AbortController();
        const signal = controller.signal;

        // Create a promise for this request and store it
        const requestPromise = (async () => {
          try {
            // Make a fetch request to our API route
            const response = await fetch("/api/generate-response", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ prompt, requestId: uniqueRequestId }),
              signal,
            });

            if (!response.ok) {
              throw new Error(
                `Error: ${response.status} ${response.statusText}`
              );
            }

            const data = await response.json();
            logger.info("Response generated successfully");

            // Cache the result for future duplicate requests
            recentRequests.set(uniqueRequestId, {
              timestamp: Date.now(),
              result: data.response,
            });

            return data.response;
          } catch (error) {
            logger.error(`Error generating response: ${error.message}`);
            setError(error instanceof Error ? error : new Error(String(error)));
            throw error;
          } finally {
            // Remove this request from pending requests
            pendingRequests.delete(uniqueRequestId);
            setIsLoading(false);
          }
        })();

        // Store the promise
        pendingRequests.set(uniqueRequestId, requestPromise);

        // Wait for it to complete
        return await requestPromise;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Error in generateResponse wrapper: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    []
  );

  /**
   * Register a callback to be called when content is complete
   */
  const onContentComplete = useCallback(
    (callback: (content: string) => void): (() => void) => {
      contentListenersRef.current.add(callback);

      // Return a cleanup function
      return () => {
        contentListenersRef.current.delete(callback);
      };
    },
    []
  );

  /**
   * Reset lesson to initial state
   */
  const resetLesson = useCallback(() => {
    setDisplayContent("");
    setContent("");
    setIsLoading(false);
    setError(null);
    setIsComplete(false);
    setIsStreamingStarted(false);
    setIsLessonReady(false);

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Use useMemo to memoize the entire service object
  return useMemo(
    () => ({
      displayContent,
      content,
      isLoading,
      error,
      isComplete,
      isStreamingStarted,
      isLessonReady,
      streamLesson,
      generateResponse,
      onContentComplete,
      resetLesson,
    }),
    [
      displayContent,
      content,
      isLoading,
      error,
      isComplete,
      isStreamingStarted,
      isLessonReady,
      streamLesson,
      generateResponse,
      onContentComplete,
      resetLesson,
    ]
  );
}
