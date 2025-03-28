import { createAPIFileRoute } from "@tanstack/react-start/api";
import Anthropic from "@anthropic-ai/sdk";

// Simple in-memory cache to deduplicate identical requests
const responseCache = new Map<
  string,
  { timestamp: number; response: string }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cleanup old cache entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        responseCache.delete(key);
      }
    }
  },
  10 * 60 * 1000
); // Run cleanup every 10 minutes

export const APIRoute = createAPIFileRoute("/api/generate-response")({
  POST: async ({ request }) => {
    try {
      const { prompt, requestId } = await request.json();

      // Use requestId or generate a simple hash for the prompt for idempotency
      const cacheKey =
        requestId ||
        `prompt:${Buffer.from(prompt).toString("base64").substring(0, 40)}`;

      // Check if we have this response cached
      if (responseCache.has(cacheKey)) {
        console.log(`Using cached response for request ${cacheKey}`);
        return new Response(
          JSON.stringify({
            response: responseCache.get(cacheKey)?.response,
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      console.log(`Generating response for request ${cacheKey}`);

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        model: "claude-3-7-sonnet-latest",
      });

      const aiResponse = response.content
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("");

      // Store in cache
      responseCache.set(cacheKey, {
        timestamp: Date.now(),
        response: aiResponse,
      });

      return new Response(
        JSON.stringify({
          response: aiResponse,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error in generate-response:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
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
