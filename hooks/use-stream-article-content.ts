import { useState, useEffect, useCallback, useRef } from "react";
import { useUpdateArticle } from "@/hooks/api/articles";
import { Logger } from "@/lib/logger";

const logger = new Logger({
  context: "useStreamArticleContent",
  enabled: false,
});

const streamContentFromAPI = async (
  subjectTitle: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  let fullContent = "";

  try {
    const requestData = {
      subject: subjectTitle,
      moduleTitle: `Introduction to ${subjectTitle}`,
      moduleDescription: `A comprehensive introduction to ${subjectTitle} covering the fundamental concepts and principles.`,
      message: `This is the first article in an exploratory learning space for the subject (${subjectTitle}). Think a minuature Wikipedia article.`,
    };

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
  article: { id: string; content: string } | null | undefined,
  subjectTitle: string
) {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // For debugging - track render count
  const renderCount = useRef(0);
  renderCount.current++;

  const updateArticleMutation = useUpdateArticle();

  // Log the current state on each render
  logger.group(`Render #${renderCount.current}`, () => {
    logger.debug("Article state:", {
      id: article?.id,
      contentLength: article?.content?.length || 0,
      contentPreview: article?.content?.substring(0, 50) + "..." || "none",
    });
    logger.debug("Hook state:", {
      contentLength: content.length,
      contentPreview: content.substring(0, 50) + "..." || "none",
      isStreaming,
      streamComplete,
      hasAbortController: !!abortController,
    });
  });

  // Start streaming content
  const startStreaming = useCallback(async () => {
    if (!article?.id || isStreaming) return;

    logger.info("Starting content streaming", { articleId: article.id });
    setIsStreaming(true);
    setStreamComplete(false);
    setContent("");

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const fullContent = await streamContentFromAPI(
        subjectTitle,
        (chunk) => {
          setContent((prev) => prev + chunk);
        },
        controller.signal
      );

      logger.info("Streaming complete, updating article", {
        articleId: article.id,
        contentLength: fullContent.length,
      });

      // Update the article in the database with the full content
      await updateArticleMutation.mutateAsync({
        id: article.id,
        content: fullContent,
      });

      setStreamComplete(true);
    } catch (error) {
      if (error.message !== "Streaming aborted") {
        logger.error("Streaming error:", error);
      } else {
        logger.info("Streaming aborted");
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  }, [article?.id, subjectTitle, isStreaming, updateArticleMutation]);

  // Stop streaming if in progress
  const stopStreaming = useCallback(() => {
    if (abortController) {
      logger.info("Manually stopping streaming");
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
    }
  }, [abortController]);

  // Auto-start streaming only if the article exists but has no content
  const shouldAutoStartStreaming =
    article?.id &&
    (!article.content || article.content.trim() === "") &&
    !isStreaming &&
    !streamComplete;

  useEffect(() => {
    logger.group("Content initialization effect", () => {
      logger.debug("Effect dependencies:", {
        articleId: article?.id,
        hasContent: !!article?.content,
        contentLength: article?.content?.length || 0,
        isStreaming,
        streamComplete,
        shouldAutoStart: shouldAutoStartStreaming,
      });
    });

    if (shouldAutoStartStreaming) {
      logger.info("Auto-starting content streaming");
      startStreaming();
    } else if (article?.content) {
      logger.info("Setting content from existing article", {
        contentPreview: article.content.substring(0, 50) + "...",
      });
      setContent(article.content);
      setStreamComplete(true);
    }
  }, [
    article?.id,
    article?.content,
    isStreaming,
    streamComplete,
    startStreaming,
    shouldAutoStartStreaming,
  ]);

  // Clean up on unmount
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
    hasExistingContent: article?.content && article.content.trim() !== "",
  };
}
