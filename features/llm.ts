import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { z } from "zod";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "Anthropic" });

// Track concurrent API calls
let activeCalls = 0;
const maxConcurrentCalls = 2; // Adjust based on Anthropic's rate limits

// Cache for storing responses to identical prompts
type CacheEntry<T> = {
  timestamp: number;
  result: T;
};

// In-memory cache with TTL
const responseCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of entries to prevent memory issues

// Function to generate a cache key from a prompt
function generateCacheKey(prompt: string): string {
  // Simple hash function for the prompt
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `prompt_${hash}`;
}

// Helper function to extract JSON from a string that might contain other text
function extractJSON(str: string): string {
  // Try to find JSON object in the string using regex
  const jsonRegex = /{[\s\S]*}/;
  const match = str.match(jsonRegex);

  if (match) {
    return match[0];
  }

  // Return the original string if no JSON object was found
  return str;
}

/**
 * Reusable function for handling calls to the Anthropic API with strongly typed responses.
 *
 * @param prompt - The prompt to send to Anthropic.
 * @param schema - A Zod schema that describes the expected response shape.
 * @param requestId - An optional request ID to track the request through its entire flow.
 * @param options - Optional configuration for this specific call.
 *
 * @returns The parsed and validated response from Anthropic.
 *
 * @throws If the response doesn't match the schema or if maximum retries are reached.
 */
export async function callAnthropic<T>(
  prompt: string,
  schema: z.ZodType<T>,
  requestId?: string,
  options?: {
    bypassCache?: boolean;
    cacheTTL?: number; // Override default TTL in milliseconds
    maxRetries?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  let attempt = 0;
  const reqId =
    requestId ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Check cache for identical prompts
  if (!options?.bypassCache) {
    const cacheKey = generateCacheKey(prompt);
    const cachedResponse = responseCache.get(cacheKey);

    if (cachedResponse) {
      const now = Date.now();
      const ttl = options?.cacheTTL ?? CACHE_TTL;

      // Check if the cached response is still valid
      if (now - cachedResponse.timestamp < ttl) {
        logger.info(
          `[${reqId}] Cache hit for prompt - returning cached response`
        );
        console.log(
          `[${reqId}] 🔍 CACHE_HIT: Using cached response instead of API call`
        );
        return cachedResponse.result;
      } else {
        // Remove expired entry
        responseCache.delete(cacheKey);
        logger.debug(
          `[${reqId}] Cache entry expired, will make fresh API call`
        );
      }
    } else {
      logger.debug(`[${reqId}] Cache miss, will make API call`);
    }
  } else {
    logger.debug(`[${reqId}] Cache bypass requested, will make fresh API call`);
  }

  // Increment active calls counter
  activeCalls++;
  console.log(`[${reqId}] Starting API call. Active calls: ${activeCalls}`);

  // Check for too many concurrent calls
  if (activeCalls > maxConcurrentCalls) {
    console.warn(
      `[${reqId}] Warning: ${activeCalls} concurrent API calls detected, which exceeds the recommended limit of ${maxConcurrentCalls}`
    );
  }

  const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"],
  });

  // Check if API key is available
  if (!process.env["ANTHROPIC_API_KEY"]) {
    console.error(
      `[${reqId}] ANTHROPIC_API_KEY is not set in environment variables`
    );
    activeCalls--; // Decrement counter before throwing
    throw new Error("Anthropic API key is not configured");
  }

  try {
    while (attempt < maxRetries) {
      try {
        logger.group(
          `[${reqId}] Attempt ${attempt + 1} of ${maxRetries}`,
          () => {
            logger.info("Starting new API request attempt");
          }
        );
        attempt++;

        logger.debug(`[${reqId}] Sending request to Anthropic API`, { prompt });
        console.log(
          `[${reqId}] Sending request to Anthropic API with prompt length:`,
          prompt.length
        );

        // Log API request details with unique marker
        console.log(
          `[${reqId}] 🔍 ANTHROPIC_REQUEST_START: ${new Date().toISOString()}`
        );

        let message;
        try {
          message = await client.messages.create({
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            model: "claude-3-7-sonnet-latest",
          });

          // Log successful response with unique marker
          console.log(
            `[${reqId}] 🔍 ANTHROPIC_RESPONSE_RECEIVED: ${new Date().toISOString()}`
          );
        } catch (apiError: any) {
          // Log the API error with a unique marker
          console.error(
            `[${reqId}] 🔍 ANTHROPIC_API_ERROR: ${apiError.message || "Unknown error"}`
          );
          console.error(`[${reqId}] API call error details:`, {
            name: apiError.name,
            message: apiError.message,
            status: apiError.status,
            type: apiError.type,
          });

          // Rethrow the error to be handled by the outer try/catch
          throw apiError;
        }

        logger.debug(`[${reqId}] Received response from Anthropic API`, {
          response: message,
        });
        console.log(
          `[${reqId}] Received raw response from Anthropic API:`,
          JSON.stringify(message.content)
        );

        const stringResponse = message.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        console.log(`[${reqId}] Extracted text response:`, stringResponse);
        logger.group("JSON Parsing", () => {
          logger.debug(`[${reqId}] Attempting to parse response`, {
            stringResponse,
          });
        });

        let parsedResponse;
        try {
          // First try to extract just the JSON part
          console.log(`[${reqId}] Attempting to parse JSON response`);
          const jsonString = extractJSON(stringResponse);
          parsedResponse = JSON.parse(jsonString);
          console.log(
            `[${reqId}] Successfully parsed JSON response:`,
            parsedResponse
          );
        } catch (parseError: any) {
          // Log JSON parsing error with unique marker
          console.error(
            `[${reqId}] 🔍 JSON_PARSE_ERROR: ${parseError.message}`
          );

          console.error(`[${reqId}] JSON parsing error:`, parseError);
          logger.warn(
            `[${reqId}] Direct parsing failed, attempting to clean response`,
            {
              error: parseError,
            }
          );
          console.log(
            `[${reqId}] Cleaning response for second parsing attempt`
          );
          const cleanedResponse = stringResponse
            .replace(/[\n\r]/g, "\\n")
            .replace(/(?<!\\)"/g, '\\"');

          try {
            parsedResponse = JSON.parse(`{"response": "${cleanedResponse}"}`);
            console.log(
              `[${reqId}] Successfully parsed cleaned response:`,
              parsedResponse
            );
            logger.info(`[${reqId}] Successfully parsed cleaned response`);
          } catch (secondError: any) {
            console.error(`[${reqId}] Second JSON parsing error:`, secondError);
            logger.error(`[${reqId}] Failed to parse cleaned response`, {
              error: secondError,
              cleanedResponse,
            });
            throw parseError;
          }
        }

        // Validate and parse the response using the provided Zod schema
        console.log(`[${reqId}] Validating response with Zod schema`);
        try {
          const result = schema.parse(parsedResponse);
          console.log(`[${reqId}] Response passed schema validation:`, result);
          logger.info(`[${reqId}] Response passed schema validation`);

          // Cache the successful result if caching is enabled
          if (!options?.bypassCache) {
            const cacheKey = generateCacheKey(prompt);

            // Ensure we don't exceed max cache size
            if (responseCache.size >= MAX_CACHE_SIZE) {
              // Remove oldest entry (first item in the Map)
              const oldestKey = responseCache.keys().next().value;
              responseCache.delete(oldestKey);
              logger.debug(
                `[${reqId}] Cache full, removed oldest entry. New size: ${responseCache.size}`
              );
            }

            responseCache.set(cacheKey, {
              timestamp: Date.now(),
              result: result,
            });
            console.log(
              `[${reqId}] 🔍 CACHE_STORE: Cached response for future use`
            );
            logger.info(
              `[${reqId}] Cached response for future use. Cache size: ${responseCache.size}`
            );
          }

          return result;
        } catch (validationError: any) {
          console.error(`[${reqId}] Schema validation error:`, validationError);
          throw validationError;
        }
      } catch (err: any) {
        logger.error(`[${reqId}] Attempt ${attempt} failed`, { error: err });
        if (attempt >= maxRetries) {
          logger.error(`[${reqId}] All attempts failed after maximum retries`, {
            maxRetries,
          });
          throw err;
        }
        // Wait 1 second before the next attempt
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // This line should never be reached
    throw new Error(
      `[${reqId}] Unreachable: Failed to obtain a valid Anthropic response`
    );
  } finally {
    // Always decrement the counter, even if there's an error
    activeCalls--;
    console.log(`[${reqId}] Completed API call. Active calls: ${activeCalls}`);
  }
}
