import { createAPIFileRoute } from "@tanstack/react-start/api";
import Anthropic from "@anthropic-ai/sdk";
import { createPrompt } from "@/prompts/chat/lesson";

// Remove the stream caching system as it's causing Response body locking issues
// Each request will now get its own independent stream

export const APIRoute = createAPIFileRoute("/api/lesson-stream")({
  POST: async ({ request }) => {
    try {
      console.log("[lesson-stream] Received request");

      // Validate request integrity
      if (!request.body) {
        console.error("[lesson-stream] Request body is null or undefined");
        return new Response(
          JSON.stringify({ error: "Request body is missing" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Parse request data
      let requestData;
      try {
        requestData = await request.json();
        console.log(
          "[lesson-stream] Request data:",
          JSON.stringify(requestData, null, 2)
        );
      } catch (parseError) {
        console.error(
          "[lesson-stream] Failed to parse request body:",
          parseError
        );
        return new Response(
          JSON.stringify({
            error: "Failed to parse request body",
            details: String(parseError),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const {
        subject,
        message,
        contextType = "introduction",
        // Introduction-specific fields
        moduleTitle,
        moduleDescription,
        // Question-specific fields
        triggeringQuestion,
        parentContent,
      } = requestData;

      // Validate required fields based on context type
      if (!subject || !message) {
        console.error("[lesson-stream] Missing required fields:", {
          subject,
          message,
        });
        return new Response(
          JSON.stringify({
            error:
              "Missing required fields: subject and message are always required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Context-specific validation
      if (
        contextType === "introduction" &&
        (!moduleTitle || !moduleDescription)
      ) {
        console.error(
          "[lesson-stream] Missing required fields for introduction context:",
          {
            moduleTitle,
            moduleDescription,
          }
        );
        return new Response(
          JSON.stringify({
            error:
              "Introduction context requires moduleTitle and moduleDescription",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else if (
        contextType === "question" &&
        (!triggeringQuestion || !parentContent)
      ) {
        console.error(
          "[lesson-stream] Missing required fields for question context:",
          {
            triggeringQuestion,
            hasParentContent: !!parentContent,
          }
        );
        return new Response(
          JSON.stringify({
            error:
              "Question context requires triggeringQuestion and parentContent",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generate the prompt with appropriate context
      let prompt;
      try {
        prompt = createPrompt({
          subject,
          message,
          contextType,
          // Include all possible parameters, the createPrompt function will use what it needs
          moduleTitle,
          moduleDescription,
          triggeringQuestion,
          parentContent,
        });
        console.log(
          "[lesson-stream] Generated prompt (first 200 chars):",
          prompt.substring(0, 200) + "..."
        );
      } catch (promptError) {
        console.error("[lesson-stream] Error generating prompt:", promptError);
        return new Response(
          JSON.stringify({
            error: "Failed to generate prompt",
            details: String(promptError),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check Anthropic API key
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error(
          "[lesson-stream] ANTHROPIC_API_KEY is missing in environment variables"
        );
        return new Response(
          JSON.stringify({ error: "API configuration error: Missing API key" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log("[lesson-stream] Initializing Anthropic client");
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Create a streaming response using ReadableStream
      console.log("[lesson-stream] Creating ReadableStream");
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log("[lesson-stream] Starting to stream from Anthropic");

            // Stream response events using the Anthropic SDK
            const stream = await anthropic.messages.create({
              max_tokens: 4096,
              messages: [{ role: "user", content: prompt }],
              model: "claude-3-7-sonnet-latest",
              stream: true,
            });

            console.log(
              "[lesson-stream] Anthropic stream created successfully"
            );

            // Process the stream of events from Anthropic
            let chunkCount = 0;
            let totalBytes = 0;

            for await (const messageStreamEvent of stream) {
              if (messageStreamEvent.type === "content_block_delta") {
                if (messageStreamEvent.delta.type === "text_delta") {
                  // Send text fragments as they arrive
                  const text = messageStreamEvent.delta.text;
                  const encoded = new TextEncoder().encode(text);
                  totalBytes += encoded.length;
                  chunkCount++;

                  if (chunkCount % 10 === 0) {
                    console.log(
                      `[lesson-stream] Streamed ${chunkCount} chunks, ${totalBytes} bytes so far`
                    );
                  }

                  controller.enqueue(encoded);
                }
              }
            }

            console.log(
              `[lesson-stream] Stream complete. Total: ${chunkCount} chunks, ${totalBytes} bytes`
            );
            controller.close();
          } catch (error) {
            console.error("[lesson-stream] Stream error:", error);
            if (error.name === "AnthropicError") {
              console.error("[lesson-stream] Anthropic API error details:", {
                status: error.status,
                type: error.type,
                message: error.message,
              });
            }
            controller.error(error);
          }
        },
      });

      console.log("[lesson-stream] Returning response stream");
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (err) {
      console.error("[lesson-stream] Fatal error in endpoint handler:", err);
      console.error("[lesson-stream] Error stack:", err.stack);
      return new Response(
        JSON.stringify({
          error: "Failed to stream lesson",
          message: err.message,
          name: err.name,
          // Include stack in development only
          stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        }),
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
