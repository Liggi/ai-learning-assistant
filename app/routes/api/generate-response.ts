import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import { AnthropicProvider } from "@/features/anthropic"; // Import the Provider
import { Logger } from "@/lib/logger"; // Import Logger if needed for route-level logging

const apiLogger = new Logger({ context: "API:/api/generate-response" });

// Define the expected shape of the LLM's JSON response
const ResponseSchema = z.object({
  response: z.string(),
});

// Removed the local cache map, TTL, and interval cleanup

export const APIRoute = createAPIFileRoute("/api/generate-response")({
  POST: async ({ request }) => {
    const reqId = `api_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      // Use the built-in request object from the route handler
      const { prompt, requestId } = await request.json();

      // Use provided requestId or the generated reqId
      const effectiveRequestId = requestId || reqId;

      apiLogger.info(
        `[${effectiveRequestId}] Received request for /api/generate-response`
      );

      const provider = new AnthropicProvider();

      const aiResult = await provider.generateResponse(
        prompt,
        ResponseSchema,
        effectiveRequestId
      );

      apiLogger.info(`[${effectiveRequestId}] Successfully generated response`);

      return new Response(JSON.stringify(aiResult), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error: any) {
      apiLogger.error(`[${reqId}] Error in generate-response:`, error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          requestId: reqId, // Include request ID in error response
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
