import { createServerFileRoute } from "@tanstack/react-start/server";
import { AnthropicProvider } from "@/features/anthropic";
import { Logger } from "@/lib/logger";
import { createPrompt } from "@/prompts/chat/lesson";

const streamLogger = new Logger({ context: "API:/api/lesson-stream", enabled: false });

export const ServerRoute = createServerFileRoute("/api/lesson-stream").methods({
  POST: async ({ request }) => {
    const reqId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      streamLogger.info(`[${reqId}] Received request`);

      // Validate request integrity
      if (!request.body) {
        streamLogger.error(`[${reqId}] Request body is null`);
        return new Response(JSON.stringify({ error: "Request body is missing" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Parse request data
      let requestData;
      try {
        requestData = await request.json();
        streamLogger.debug(`[${reqId}] Parsed request data`);
      } catch (parseError) {
        streamLogger.error(`[${reqId}] Failed to parse request body`, parseError);
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
        streamLogger.error(`[${reqId}] Missing required fields: subject or message`);
        return new Response(
          JSON.stringify({
            error: "Missing required fields: subject and message are always required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Context-specific validation
      if (contextType === "introduction" && (!moduleTitle || !moduleDescription)) {
        streamLogger.error(`[${reqId}] Missing required fields for introduction context:`, {
          moduleTitle,
          moduleDescription,
        });
        return new Response(
          JSON.stringify({
            error: "Introduction context requires moduleTitle and moduleDescription",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else if (contextType === "question" && (!triggeringQuestion || !parentContent)) {
        streamLogger.error(`[${reqId}] Missing required fields for question context:`, {
          triggeringQuestion,
          hasParentContent: !!parentContent,
        });
        return new Response(
          JSON.stringify({
            error: "Question context requires triggeringQuestion and parentContent",
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
        streamLogger.debug(`[${reqId}] Generated prompt`);
      } catch (promptError) {
        streamLogger.error(`[${reqId}] Error generating prompt`, promptError);
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

      // Instantiate the provider (handles API key check)
      let provider: AnthropicProvider;
      try {
        provider = new AnthropicProvider();
        streamLogger.info(`[${reqId}] AnthropicProvider initialized`);
      } catch (providerError) {
        streamLogger.error(`[${reqId}] Failed to initialize provider`, providerError);
        return new Response(JSON.stringify({ error: "API configuration error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create a streaming response using ReadableStream
      streamLogger.info(`[${reqId}] Creating ReadableStream`);
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            streamLogger.info(`[${reqId}] Starting Anthropic stream`);

            // Use the client instance from the provider to create the stream
            const messageStream = await provider.client.messages.create({
              max_tokens: 4096,
              messages: [{ role: "user", content: prompt }],
              model: "claude-3-5-sonnet-latest",
              stream: true,
            });

            streamLogger.debug(`[${reqId}] Anthropic stream initiated`);

            // Process the stream of events from Anthropic
            let chunkCount = 0;
            let totalBytes = 0;

            for await (const event of messageStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                const text = event.delta.text;
                const encoded = new TextEncoder().encode(text);
                totalBytes += encoded.length;
                chunkCount++;

                if (chunkCount % 20 === 0) {
                  streamLogger.debug(`[${reqId}] Streamed ${chunkCount} chunks`);
                }

                controller.enqueue(encoded);
              } else if (event.type === "message_stop") {
                streamLogger.info(`[${reqId}] Stream finished by message_stop event.`);
              }
            }

            streamLogger.info(`[${reqId}] Stream complete. Total chunks: ${chunkCount}`);
            controller.close();
          } catch (error: any) {
            streamLogger.error(`[${reqId}] Stream error`, {
              name: error.name,
              message: error.message,
              status: error.status,
              type: error.type,
            });
            controller.error(error);
          }
        },
      });

      streamLogger.info(`[${reqId}] Returning response stream`);
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (err: any) {
      streamLogger.error(`[${reqId}] Fatal error in endpoint handler`, err);
      streamLogger.error(`[${reqId}] Error stack:`, err.stack);
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
