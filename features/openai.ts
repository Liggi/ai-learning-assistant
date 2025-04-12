import OpenAI from "openai";
import { z } from "zod";
import { Logger } from "@/lib/logger";
import {
  LLMProvider,
  LLMCallOptions,
  responseCache,
  CACHE_TTL,
  MAX_CACHE_SIZE,
  generateCacheKey,
  extractJSON,
} from "./llm-base";

const openaiLogger = new Logger({ context: "OpenAIProvider" });

type OpenAIProviderOptions = {
  model?: string;
};

export class OpenAIProvider implements LLMProvider<OpenAIProviderOptions> {
  public client: OpenAI;

  constructor() {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      openaiLogger.error("OPENAI_API_KEY is not set in environment variables");
      throw new Error("OpenAI API key is not configured");
    }
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse<T>(
    prompt: string,
    schema: z.ZodType<T>,
    requestId: string,
    options?: LLMCallOptions & OpenAIProviderOptions
  ): Promise<T> {
    const model = options?.model ?? "gpt-4o"; // Defaulting to gpt-4o

    openaiLogger.debug(`[${requestId}] Sending request to OpenAI API`, {
      model,
      promptLength: prompt.length,
    });

    let completion;
    try {
      completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
      });
      openaiLogger.debug(`[${requestId}] Received response from OpenAI API`);
    } catch (apiError: any) {
      openaiLogger.error(`[${requestId}] OpenAI API call failed`, {
        error: {
          message: apiError.message,
          status: apiError.status,
          type: apiError.type,
          name: apiError.name,
        },
      });
      throw apiError;
    }

    const stringResponse = completion.choices[0]?.message?.content;

    if (!stringResponse) {
      openaiLogger.error(`[${requestId}] No content received from OpenAI API`);
      throw new Error("Received empty response from OpenAI API");
    }

    openaiLogger.debug(`[${requestId}] Extracted text response`, {
      length: stringResponse.length,
    });

    let parsedResponse;
    try {
      const jsonString = extractJSON(stringResponse);
      parsedResponse = JSON.parse(jsonString);
      openaiLogger.debug(`[${requestId}] Successfully parsed JSON response`);
    } catch (parseError: any) {
      openaiLogger.error(`[${requestId}] JSON parsing failed`, {
        error: parseError,
        responseSnippet: stringResponse.slice(0, 100),
      });
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }

    try {
      const result = schema.parse(parsedResponse);
      openaiLogger.debug(`[${requestId}] Response passed schema validation`);
      return result;
    } catch (validationError: any) {
      openaiLogger.error(`[${requestId}] Schema validation failed`, {
        error: validationError,
      });
      throw validationError;
    }
  }
}

/**
 * @deprecated Prefer using the central `callLLM` function once implemented.
 */
export async function callOpenAI<T>(
  prompt: string,
  schema: z.ZodType<T>,
  requestId?: string,
  options?: {
    bypassCache?: boolean;
    cacheTTL?: number;
    maxRetries?: number;
    model?: string;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  let attempt = 0;
  const reqId =
    requestId ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const model = options?.model ?? "gpt-4o"; // Defaulting to gpt-4o

  if (!options?.bypassCache) {
    const cacheKey = generateCacheKey(prompt, "openai", model);
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      const now = Date.now();
      const ttl = options?.cacheTTL ?? CACHE_TTL;
      if (now - cachedResponse.timestamp < ttl) {
        openaiLogger.info(`[${reqId}] Cache hit, returning cached response`);
        return cachedResponse.result;
      } else {
        responseCache.delete(cacheKey);
        openaiLogger.debug(`[${reqId}] Cache entry expired`);
      }
    } else {
      openaiLogger.debug(`[${reqId}] Cache miss`);
    }
  } else {
    openaiLogger.debug(`[${reqId}] Cache bypass requested`);
  }

  const provider = new OpenAIProvider();

  while (attempt < maxRetries) {
    try {
      attempt++;
      openaiLogger.info(
        `[${reqId}] Attempt ${attempt}/${maxRetries}: Calling OpenAIProvider`
      );

      const result = await provider.generateResponse(prompt, schema, reqId, {
        maxRetries: 1, // Retries are handled in this outer function
        model: model,
      });

      if (!options?.bypassCache) {
        const cacheKey = generateCacheKey(prompt, "openai", model);
        if (responseCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = responseCache.keys().next().value;
          responseCache.delete(oldestKey);
          openaiLogger.debug(`[${reqId}] Cache full, removed oldest entry.`);
        }
        responseCache.set(cacheKey, {
          timestamp: Date.now(),
          result: result,
        });
        openaiLogger.info(`[${reqId}] Cached successful response.`);
      }

      return result;
    } catch (err: any) {
      openaiLogger.error(`[${reqId}] Attempt ${attempt}/${maxRetries} failed`, {
        error: err?.message || err,
      });

      if (attempt >= maxRetries) {
        openaiLogger.error(
          `[${reqId}] All attempts failed after ${maxRetries} retries.`
        );
        throw err;
      }

      // Exponential backoff could be considered here, but simple linear delay for now
      const delay = 1000 * attempt;
      openaiLogger.info(`[${reqId}] Retrying after ${delay}ms delay.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should be unreachable if maxRetries >= 1, but satisfies TypeScript
  throw new Error(
    `[${reqId}] Unreachable: Failed to obtain a valid OpenAI response after retries`
  );
}
