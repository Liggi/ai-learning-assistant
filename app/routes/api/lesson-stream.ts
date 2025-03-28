import { createAPIFileRoute } from "@tanstack/react-start/api";
import Anthropic from "@anthropic-ai/sdk";
import { createPrompt } from "@/prompts/chat/lesson";

// Simple in-memory cache for active streaming requests
const activeStreams = new Map<string, ReadableStream>();
const STREAM_TTL = 60 * 1000; // 1 minute TTL for active streams

// Create a unique key for request deduplication
function createRequestKey(data: any): string {
  return `lesson:${JSON.stringify(data)}`;
}

// Cleanup function for stale stream references
setInterval(() => {
  for (const [key, stream] of activeStreams.entries()) {
    // After TTL, we'll remove the reference even if it might still be active
    // This allows new requests to go through after sufficient time
    activeStreams.delete(key);
  }
}, STREAM_TTL);

export const APIRoute = createAPIFileRoute("/api/lesson-stream")({
  POST: async ({ request }) => {
    try {
      const requestData = await request.json();
      const { subject, moduleTitle, moduleDescription, message } = requestData;

      // Create a unique request key for deduplication
      const requestKey = createRequestKey(requestData);

      // Check if we already have an active stream for this exact request
      if (activeStreams.has(requestKey)) {
        console.log(`Reusing existing stream for request: ${requestKey}`);
        return new Response(activeStreams.get(requestKey), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

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
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream response events using the Anthropic SDK
            const stream = await anthropic.messages.create({
              max_tokens: 4096,
              messages: [{ role: "user", content: prompt }],
              model: "claude-3-7-sonnet-latest",
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

            // Remove from active streams on error
            activeStreams.delete(requestKey);
          }
        },
      });

      // Store the stream for potential reuse
      activeStreams.set(requestKey, stream);

      // Set a timeout to remove this stream from active streams
      setTimeout(() => {
        activeStreams.delete(requestKey);
      }, STREAM_TTL);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
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
