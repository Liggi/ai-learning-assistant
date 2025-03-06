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
