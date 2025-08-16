import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateArticle } from "@/hooks/api/articles";
import { useQuestionByChildArticleId } from "@/hooks/api/questions";
import { Logger } from "@/lib/logger";

const logger = new Logger({
  context: "useStreamArticleContent",
  enabled: false,
});

const streamContentFromAPI = async (
  subjectTitle: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  context?: {
    triggeringQuestion?: string;
    parentArticleContent?: string;
  }
): Promise<string> => {
  let fullContent = "";

  try {
    let requestData: {
      subject: string;
      contextType: string;
      triggeringQuestion?: string;
      parentContent?: string;
      message: string;
      moduleTitle?: string;
      moduleDescription?: string;
    };

    if (context?.triggeringQuestion && context?.parentArticleContent) {
      // If we have a contextual prompt, use it
      logger.info("Using contextual prompt for content generation", {
        hasQuestion: !!context.triggeringQuestion,
        parentContentLength: context.parentArticleContent?.length || 0,
      });

      requestData = {
        subject: subjectTitle,
        contextType: "question",
        triggeringQuestion: context.triggeringQuestion,
        parentContent: context.parentArticleContent,
        message: `Answer this question about ${subjectTitle}: "${context.triggeringQuestion}". Use the context from the previous article as a reference.`,
      };
    } else {
      // Default to the original generic introduction prompt
      logger.info("Using generic prompt for content generation", {
        subject: subjectTitle,
      });

      requestData = {
        subject: subjectTitle,
        contextType: "introduction",
        moduleTitle: `Introduction to ${subjectTitle}`,
        moduleDescription: `A comprehensive introduction to ${subjectTitle} covering the fundamental concepts and principles.`,
        message: `This is the first article in an exploratory learning space for the subject (${subjectTitle}). Think a minuature Wikipedia article.`,
      };
    }

    logger.info("🌐 Making fetch request to /api/lesson-stream", {
      subject: subjectTitle,
      contextType: requestData.contextType,
      timestamp: Date.now(),
    });

    const response = await fetch("/api/lesson-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
      signal: signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      onChunk(chunk);
    }

    return fullContent;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Streaming aborted");
    }
    console.error("Error streaming content:", error);
    throw error;
  }
};

export function useStreamArticleContent(
  article: { id: string; content: string; isRoot?: boolean } | null | undefined,
  subjectTitle: string
) {
  logger.info("🏗️ useStreamArticleContent HOOK CALLED", {
    articleId: article?.id,
    subjectTitle,
    hasContent: !!(article?.content && article.content.trim() !== ""),
    timestamp: Date.now(),
  });
  const queryClient = useQueryClient();
  const router = useRouter();

  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Track the previous article ID to detect changes
  const previousArticleId = useRef<string | null>(null);

  const updateArticleMutation = useUpdateArticle();

  // For non-root articles, fetch the parent question information
  const needsContext = article?.id && article?.isRoot === false;
  const {
    data: questionData,
    isLoading: isLoadingQuestion,
    error: questionError,
  } = useQuestionByChildArticleId(needsContext ? article.id : null);

  // Start streaming content (memoized)
  const startStreaming = useCallback(async () => {
    logger.info("🔄 startStreaming useCallback recreated", {
      articleId: article?.id,
      subjectTitle,
      isStreaming,
      streamComplete,
      isLoadingQuestion,
      hasQuestionData: !!questionData,
    });
    const currentArticleId = article?.id; // Get ID at the time of call
    // Guard clauses inside startStreaming check current state
    if (!currentArticleId || isStreaming || streamComplete) {
      logger.debug("Skipping startStreaming call", {
        articleId: currentArticleId,
        isStreaming,
        streamComplete,
      });
      return;
    }

    // Check if we need to wait for question data to load
    if (needsContext && isLoadingQuestion) {
      logger.debug("Deferring streaming until question data is loaded");
      return;
    }

    // If there was an error fetching question data, log it but continue with generic prompt
    if (questionError) {
      logger.warn("Error fetching question data, using generic prompt", {
        error: questionError,
      });
    }

    logger.info("🔥 EXECUTING startStreaming - ACTUAL API CALL", {
      articleId: currentArticleId,
      hasQuestionContext: !!questionData,
      timestamp: Date.now(),
    });

    setIsStreaming(true);
    setStreamComplete(false); // Explicitly set here too
    setContent("");

    const controller = new AbortController();
    setAbortController(controller);

    // Prepare context if available
    const streamContext = questionData
      ? {
          triggeringQuestion: questionData.question.text,
          parentArticleContent: questionData.parentArticle?.content || "",
        }
      : undefined;

    try {
      const fullContent = await streamContentFromAPI(
        subjectTitle,
        (chunk) => {
          setContent((prev) => prev + chunk);
        },
        controller.signal,
        streamContext // Pass the context to the streaming function
      );

      logger.info("Streaming complete, updating article", {
        articleId: currentArticleId, // Use captured ID
        contentLength: fullContent.length,
        hadContext: !!streamContext,
      });

      await updateArticleMutation.mutateAsync({
        id: currentArticleId, // Use captured ID
        content: fullContent,
      });

      // Invalidate React Query cache for article data
      queryClient.invalidateQueries({
        queryKey: ["article", currentArticleId],
      });

      // Force router to refresh route loader data (this will reload learning map)
      router.invalidate();

      setStreamComplete(true);
    } catch (error) {
      if (error.name !== "AbortError" && error.message !== "Streaming aborted") {
        logger.error("Streaming error:", error);
      } else {
        logger.info("Streaming aborted or interrupted");
      }
      setStreamComplete(false); // Ensure not marked complete on error/abort
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  }, [
    subjectTitle,
    isStreaming,
    streamComplete,
    updateArticleMutation,
    article?.id,
    needsContext,
    isLoadingQuestion,
    questionData,
    questionError, // Invalidate React Query cache for article data
    queryClient.invalidateQueries, // Force router to refresh route loader data (this will reload learning map)
    router.invalidate,
  ]);

  // Effect 1: Reset state on article ID change ONLY
  useEffect(() => {
    const currentArticleId = article?.id || null;
    if (currentArticleId !== previousArticleId.current) {
      logger.info("Effect 1: Article ID changed, resetting stream state", {
        prevId: previousArticleId.current,
        newId: currentArticleId,
      });

      setContent("");
      setStreamComplete(false);
      setIsStreaming(false);

      if (abortController) {
        logger.info("Effect 1: Aborting previous stream");
        abortController.abort();
        setAbortController(null);
      }

      // Update the ref *after* resetting state for the next comparison
      previousArticleId.current = currentArticleId;
    }
    // This effect only runs when article ID changes or abortController instance changes
  }, [article?.id, abortController]);

  // Effect 2: Handle content setting or trigger stream based on CURRENT state
  useEffect(() => {
    logger.info("🚀 Effect 2 triggered", {
      articleId: article?.id,
      hasContent: !!(article?.content && article.content.trim() !== ""),
      isStreaming,
      streamComplete,
      contentLength: content.length,
      startStreamingFnChanged: "check-logs-above",
    });
    const currentArticleId = article?.id || null;

    // Wait until the ID is stable (matches the ref updated by Effect 1)
    if (currentArticleId !== previousArticleId.current) {
      logger.debug("Effect 2: Skipping, waiting for ID stabilization/reset", {
        currentArticleId,
        trackedId: previousArticleId.current,
      });
      return;
    }

    // If we are currently streaming, do nothing in this effect
    if (isStreaming) {
      logger.debug("Effect 2: Skipping, currently streaming", {
        articleId: currentArticleId,
      });
      return;
    }

    // --- ID is stable and not currently streaming ---

    if (currentArticleId) {
      // We have a valid, stable article ID
      const articleHasContent = article?.content && article.content.trim() !== "";

      if (articleHasContent) {
        // Article has content - set local state if it differs
        if (content !== article.content) {
          logger.info("Effect 2: Setting content from prop", {
            articleId: currentArticleId,
          });
          setContent(article.content);
          // Ensure stream is marked complete if we receive full content
          if (!streamComplete) {
            setStreamComplete(true);
          }
        }
      } else {
        // Article has NO content - attempt to stream if not already complete
        if (!streamComplete) {
          logger.info("🎯 Effect 2: TRIGGERING STREAM for empty article", {
            articleId: currentArticleId,
            timestamp: Date.now(),
          });
          startStreaming();
        } else {
          logger.debug("Effect 2: Skipping stream start, already marked complete", {
            articleId: currentArticleId,
          });
        }
      }
    } else {
      logger.debug("Effect 2: Skipping, no valid article ID", {
        currentArticleId,
      });
    }

    // This effect runs when the article object, local state (isStreaming, streamComplete, content), or startStreaming function changes
  }, [
    article, // Use whole article object as dep
    isStreaming,
    streamComplete,
    content, // Include local content to detect external updates
    startStreaming,
  ]);

  // Clean up stream on unmount (remains the same)
  useEffect(() => {
    return () => {
      if (abortController) {
        logger.info("Cleaning up: aborting stream on unmount");
        abortController.abort();
      }
    };
  }, [abortController]);

  return {
    content,
    isStreaming,
    streamComplete,
    hasExistingContent: !!(article?.content && article.content.trim() !== ""),
  };
}
