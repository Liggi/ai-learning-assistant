import { useState, useEffect, useRef } from "react";

interface LessonParams {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
  message: string;
}

export function useStreamingLesson(initialData: LessonParams) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStreamingComplete, setIsStreamingComplete] =
    useState<boolean>(false);

  // Use refs to track initialization and prevent duplicate requests
  const isInitializedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Only run this effect once
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    async function fetchStreamingLesson() {
      try {
        setIsLoading(true);
        setContent("");
        setIsStreamingComplete(false);

        // Make a fetch request to our streaming API route
        const response = await fetch("/api/lesson-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(initialData),
          signal,
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
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
              setIsStreamingComplete(true);
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            setContent((prevContent) => prevContent + chunk);
          }

          // Ensure we get the last bits
          const lastChunk = decoder.decode();
          if (lastChunk) {
            setContent((prevContent) => prevContent + lastChunk);
          }
        }

        setIsLoading(false);
      } catch (err) {
        // Only set error if the request wasn't aborted
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        setIsLoading(false);
      }
    }

    fetchStreamingLesson();

    // Cleanup function to abort any in-progress streams when the component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this only runs once

  // Allow manual refresh if needed
  const refreshLesson = () => {
    if (!isLoading) {
      // Reset state
      setContent("");
      setError(null);
      setIsStreamingComplete(false);
      isInitializedRef.current = false;

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Re-run the effect in the next render cycle
      setTimeout(() => {
        isInitializedRef.current = false;
      }, 0);
    }
  };

  return { content, isLoading, error, refreshLesson, isStreamingComplete };
}
