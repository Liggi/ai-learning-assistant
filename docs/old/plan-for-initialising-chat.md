# Plan for Implementing Streaming Lesson Generation in ChatLayout

## Current State

- The `ChatLayout` component currently displays hardcoded markdown content
- This content is displayed using the `MarkdownDisplay` component
- The codebase has an existing lesson generation module in `features/generators/lesson.ts`
- This module uses the Anthropic API to generate lessons but doesn't support streaming

## Implementation Goals

1. When the `ChatLayout` component first loads, it should initiate a lesson generation request
2. The generated content should stream in as it arrives, rather than waiting for the complete response
3. The UI should provide visual feedback during the streaming process
4. Prevent multiple initialization requests during component re-renders

## Technical Implementation

### 1. Create API Route for Streaming Lesson ✅

We've created an API route that supports streaming responses:

```typescript
// app/routes/api/lesson-stream.ts
import { createAPIFileRoute } from "@tanstack/start/api";
import Anthropic from "@anthropic-ai/sdk";
import { createPrompt } from "@/prompts/chat/lesson";

export const APIRoute = createAPIFileRoute("/api/lesson-stream")({
  POST: async ({ request }) => {
    try {
      const requestData = await request.json();
      const { subject, moduleTitle, moduleDescription, message } = requestData;

      const prompt = createPrompt({
        subject,
        moduleTitle,
        moduleDescription,
        message,
      });

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Create a streaming response using ReadableStream
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              // Stream response events using the Anthropic SDK
              const stream = await anthropic.messages.create({
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }],
                model: "claude-3-5-sonnet-latest",
                stream: true,
              });

              // Process the stream of events from Anthropic
              for await (const messageStreamEvent of stream) {
                if (messageStreamEvent.type === "content_block_delta") {
                  if (messageStreamEvent.delta.type === "text_delta") {
                    // Send text fragments as they arrive
                    const text = messageStreamEvent.delta.text;
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                }
              }
              controller.close();
            } catch (error) {
              console.error("Stream error:", error);
              controller.error(error);
            }
          },
        }),
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    } catch (err) {
      console.error("Error in streaming chat:", err);
      return new Response(
        JSON.stringify({ error: "Failed to stream lesson" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
});
```

### 2. Create a Hook for Streaming Content ✅

We've created a custom hook to manage the streaming state with safeguards against multiple initializations:

```typescript
// hooks/use-streaming-lesson.ts
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
            if (done) break;

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

  return { content, isLoading, error, refreshLesson };
}
```

### 3. Modify ChatLayout Component ✅

We've updated the `ChatLayout` component to use the streaming hook:

```typescript
// components/chat-layout.tsx
import React from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { useStreamingLesson } from "@/hooks/use-streaming-lesson";

// Default lesson parameters
const DEFAULT_LESSON_PARAMS = {
  subject: "Programming",
  moduleTitle: "Introduction to React",
  moduleDescription: "Learn the basics of React and how to build interactive UIs",
  message: "Explain the core concepts of React to a beginner developer",
};

const ChatLayout: React.FC = () => {
  // Use the streaming lesson hook with safeguards against multiple initializations
  const { content, isLoading, error, refreshLesson } = useStreamingLesson(DEFAULT_LESSON_PARAMS);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <div className="w-1/3 h-full border-r border-slate-700 relative">
        <button
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md
                   text-xs font-medium transition-all duration-150
                   bg-slate-800/50 border border-slate-700/50
                   hover:bg-slate-800 hover:border-slate-700"
        >
          <LayoutGrid size={12} className="text-slate-400" />
          <span className="text-slate-300">Learning Plan</span>
        </button>
      </div>

      <div className="w-2/3 h-full">
        <div className="flex-1 flex flex-col h-screen bg-slate-900 text-slate-300">
          <div className="flex-shrink-0 px-8 py-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-slate-200">
                {DEFAULT_LESSON_PARAMS.moduleTitle}
              </h2>
              <p className="text-sm text-slate-400/80 mt-1">
                {DEFAULT_LESSON_PARAMS.moduleDescription}
              </p>
            </div>
            <button
              onClick={refreshLesson}
              disabled={isLoading}
              className={`p-2 rounded-md transition-all duration-150 ${
                isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-slate-800 active:bg-slate-700"
              }`}
              aria-label="Refresh lesson"
            >
              <RefreshCw size={16} className={`text-slate-400 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto">
            {isLoading && content === "" ? (
              <div className="animate-pulse">
                <div className="h-4 bg-slate-700/30 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-700/30 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-slate-700/30 rounded w-5/6 mb-3"></div>
                <div className="h-4 bg-slate-700/30 rounded w-2/3 mb-3"></div>
              </div>
            ) : error ? (
              <div className="text-red-400">
                Error loading lesson: {error.message}
              </div>
            ) : (
              <MarkdownDisplay content={content} />
            )}

            {isLoading && content !== "" && (
              <div className="mt-2 inline-block">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
```

### 4. Add Typing Indicator Styles ✅

We've added the styles for the typing indicator to the global CSS:

```css
/* styles/globals.css */
/* Typing indicator styles */
.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.typing-indicator span {
  width: 4px;
  height: 4px;
  background-color: rgba(148, 163, 184, 0.7);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
```

## Preventing Multiple Initializations

To ensure lesson initialization doesn't happen multiple times due to re-renders, we've implemented several safeguards:

1. **Initialization Reference**: We use a `useRef` to track whether initialization has already occurred, preventing duplicate requests.
2. **Empty Dependency Array**: The `useEffect` hook has an empty dependency array to ensure it only runs once after the initial render.

3. **Abort Controller**: We implement an AbortController to cancel any in-progress streams if the component unmounts.

4. **Manual Refresh Mechanism**: We provide a `refreshLesson` function that explicitly allows reinitializing the lesson when needed, with proper cleanup of existing streams.

5. **Cleanup on Unmount**: The useEffect cleanup function ensures any ongoing streams are properly aborted when the component unmounts.

## Implementation Steps

1. ✅ Create an API route that handles streaming response from Anthropic
2. ✅ Create the `use-streaming-lesson.ts` hook for managing streaming state
3. ✅ Update the ChatLayout component to use the streaming hook
4. ✅ Add the typing indicator styles to your CSS
5. 📝 Test the implementation and fix any issues
6. 📝 Add additional error handling if needed
7. 📝 Optimize the streaming performance

## Considerations

- **API Costs**: Streaming responses from Anthropic may have different pricing implications compared to non-streaming responses
- **Error Handling**: Robust error handling is essential for streaming connections that might disconnect
- **User Experience**: Ensure the UI remains responsive during streaming
- **Accessibility**: Ensure the streaming content and loading indicators are accessible
- **State Management**: For more complex applications, consider using a state management solution to better control initialization
- **Server Component Compatibility**: If using React Server Components, adapt the streaming approach accordingly
