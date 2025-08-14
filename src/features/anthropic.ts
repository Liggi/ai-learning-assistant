import Anthropic from "@anthropic-ai/sdk";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { z } from "zod";
import { Logger } from "@/lib/logger";
import { robustLLMCall } from "@/lib/robust-llm-call";
import {
  CACHE_TTL,
  extractJSON,
  generateCacheKey,
  type LLMCallOptions,
  type LLMProvider,
  MAX_CACHE_SIZE,
  responseCache,
} from "./llm-base";

const anthropicLogger = new Logger({ context: "AnthropicProvider", enabled: false });

type AnthropicProviderOptions = {
  model?: string;
};

export class AnthropicProvider implements LLMProvider<AnthropicProviderOptions> {
  public client: Anthropic;

  constructor() {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    const heliconeApiKey = process.env["HELICONE_API_KEY"];

    if (!apiKey) {
      anthropicLogger.error("ANTHROPIC_API_KEY is not set in environment variables");
      throw new Error("Anthropic API key is not configured");
    }

    if (!heliconeApiKey) {
      anthropicLogger.error("HELICONE_API_KEY is not set in environment variables");
      throw new Error("Helicone API key is not configured");
    }

    this.client = new Anthropic({
      apiKey,
      baseURL: "https://anthropic.helicone.ai/",
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${heliconeApiKey}`,
      },
    });
  }

  async generateResponse<T>(
    prompt: string,
    schema: z.ZodType<T>,
    requestId: string,
    options?: LLMCallOptions & AnthropicProviderOptions
  ): Promise<T> {
    const model = options?.model ?? "claude-3-7-sonnet-latest";

    const heliconeHeaders: Record<string, string> = {};
    if (options?.heliconeMetadata) {
      const metadata = options.heliconeMetadata;
      if (metadata.type) heliconeHeaders["Helicone-Property-Type"] = metadata.type;
      if (metadata.subject) heliconeHeaders["Helicone-Property-Subject"] = metadata.subject;
      if (metadata.articleId) heliconeHeaders["Helicone-Property-Article-Id"] = metadata.articleId;
      if (metadata.userId) heliconeHeaders["Helicone-User-Id"] = metadata.userId;
      if (metadata.sessionId) heliconeHeaders["Helicone-Session-Id"] = metadata.sessionId;
      if (metadata.pipelineId)
        heliconeHeaders["Helicone-Property-Pipeline-Id"] = metadata.pipelineId;
      if (metadata.pipelineStage)
        heliconeHeaders["Helicone-Property-Pipeline-Stage"] = metadata.pipelineStage;
      if (metadata.sequence !== undefined)
        heliconeHeaders["Helicone-Property-Sequence"] = metadata.sequence.toString();
      if (metadata.parentRequestId)
        heliconeHeaders["Helicone-Property-Parent-Request"] = metadata.parentRequestId;
    }

    const response = await robustLLMCall(
      () =>
        this.client.messages.create(
          {
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
            model: model,
          },
          {
            headers: heliconeHeaders,
          }
        ),
      {
        provider: "anthropic",
        requestType: options?.heliconeMetadata?.type || "generate",
        retries: options?.maxRetries ?? 3,
        metadata: {
          requestId,
          model,
          promptLength: prompt.length,
        },
      }
    );

    const stringResponse = response.content;

    anthropicLogger.debug(`[${requestId}] Extracted text response`, {
      length: stringResponse.length,
    });

    let parsedResponse;
    try {
      const jsonString = extractJSON(stringResponse);
      parsedResponse = JSON.parse(jsonString);
      anthropicLogger.debug(`[${requestId}] Successfully parsed JSON response`);
    } catch (parseError: any) {
      anthropicLogger.error(`[${requestId}] JSON parsing failed`, {
        error: parseError,
        responseSnippet: stringResponse.slice(0, 100),
      });
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }

    try {
      const result = schema.parse(parsedResponse);
      anthropicLogger.debug(`[${requestId}] Response passed schema validation`);
      return result;
    } catch (validationError: any) {
      anthropicLogger.error(`[${requestId}] Schema validation failed`, {
        error: validationError,
      });
      throw validationError;
    }
  }
}

/**
 * @deprecated Prefer using the central `callLLM` function once implemented.
 */
export async function callAnthropic<T>(
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
  const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const model = options?.model ?? "claude-3-7-sonnet-latest";

  if (!options?.bypassCache) {
    const cacheKey = generateCacheKey(prompt, "anthropic", model);
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      const now = Date.now();
      const ttl = options?.cacheTTL ?? CACHE_TTL;
      if (now - cachedResponse.timestamp < ttl) {
        anthropicLogger.info(`[${reqId}] Cache hit, returning cached response`);
        return cachedResponse.result;
      } else {
        responseCache.delete(cacheKey);
        anthropicLogger.debug(`[${reqId}] Cache entry expired`);
      }
    } else {
      anthropicLogger.debug(`[${reqId}] Cache miss`);
    }
  } else {
    anthropicLogger.debug(`[${reqId}] Cache bypass requested`);
  }

  const provider = new AnthropicProvider();

  while (attempt < maxRetries) {
    try {
      attempt++;
      anthropicLogger.info(
        `[${reqId}] Attempt ${attempt}/${maxRetries}: Calling AnthropicProvider`
      );

      const result = await provider.generateResponse(prompt, schema, reqId, {
        maxRetries: 1,
        model: model,
      });

      if (!options?.bypassCache) {
        const cacheKey = generateCacheKey(prompt, "anthropic", model);
        if (responseCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = responseCache.keys().next().value;
          responseCache.delete(oldestKey);
          anthropicLogger.debug(`[${reqId}] Cache full, removed oldest entry.`);
        }
        responseCache.set(cacheKey, {
          timestamp: Date.now(),
          result: result,
        });
        anthropicLogger.info(`[${reqId}] Cached successful response.`);
      }

      return result;
    } catch (err: any) {
      anthropicLogger.error(`[${reqId}] Attempt ${attempt}/${maxRetries} failed`, {
        error: err?.message || err,
      });

      if (attempt >= maxRetries) {
        anthropicLogger.error(`[${reqId}] All attempts failed after ${maxRetries} retries.`);
        throw err;
      }

      const delay = 1000 * attempt;
      anthropicLogger.info(`[${reqId}] Retrying after ${delay}ms delay.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `[${reqId}] Unreachable: Failed to obtain a valid Anthropic response after retries`
  );
}
