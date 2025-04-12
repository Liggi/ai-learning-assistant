import { z } from "zod";
import { Logger } from "@/lib/logger";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

const llmBaseLogger = new Logger({ context: "LLMBase" });

export type LLMCallOptions = {
  maxRetries?: number;
};

export interface LLMProvider<ProviderOptions = unknown> {
  generateResponse<T>(
    prompt: string,
    schema: z.ZodType<T>,
    requestId: string,
    options?: LLMCallOptions & ProviderOptions
  ): Promise<T>;
}

export type CacheEntry<T> = {
  timestamp: number;
  result: T;
};

export const responseCache = new Map<string, CacheEntry<any>>();
export const CACHE_TTL = 60 * 60 * 1000;
export const MAX_CACHE_SIZE = 100;

export function generateCacheKey(
  prompt: string,
  provider: string,
  model: string
): string {
  const combined = `${provider}:${model}:${prompt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `prompt_${hash}`;
}

export function extractJSON(str: string): string {
  const jsonRegex = /```json\s*({[\s\S]*?})\s*```|({[\s\S]*})/;
  const match = str.match(jsonRegex);

  if (match) {
    return match[1] || match[2];
  }

  llmBaseLogger.warn(
    "Could not extract JSON object using regex, returning raw string.",
    { strPreview: str.slice(0, 50) }
  );
  return str;
}

type ProviderName = "anthropic" | "openai";

type CallLLMOptions = {
  bypassCache?: boolean;
  cacheTTL?: number;
  maxRetries?: number;
  model?: string;
};

export async function callLLM<T>(
  providerName: ProviderName,
  prompt: string,
  schema: z.ZodType<T>,
  requestId?: string,
  options?: CallLLMOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  let attempt = 0;
  const reqId =
    requestId ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const modelForCache = options?.model ?? "default_model";

  if (!options?.bypassCache) {
    const cacheKey = generateCacheKey(prompt, providerName, modelForCache);
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      const now = Date.now();
      const ttl = options?.cacheTTL ?? CACHE_TTL;
      if (now - cachedResponse.timestamp < ttl) {
        llmBaseLogger.info(
          `[${reqId}] Cache hit for ${providerName}:${modelForCache}, returning cached response`
        );
        try {
          return schema.parse(cachedResponse.result);
        } catch (validationError) {
          llmBaseLogger.warn(
            `[${reqId}] Cached data failed validation, proceeding to fetch fresh data.`,
            { error: validationError }
          );
          responseCache.delete(cacheKey);
        }
      } else {
        responseCache.delete(cacheKey);
        llmBaseLogger.debug(`[${reqId}] Cache entry expired`);
      }
    } else {
      llmBaseLogger.debug(
        `[${reqId}] Cache miss for ${providerName}:${modelForCache}`
      );
    }
  } else {
    llmBaseLogger.debug(`[${reqId}] Cache bypass requested`);
  }

  let provider: LLMProvider<any>;
  let actualModelUsed: string;

  try {
    switch (providerName) {
      case "anthropic":
        provider = new AnthropicProvider();
        actualModelUsed = options?.model ?? "claude-3-sonnet-20240229";
        break;
      case "openai":
        provider = new OpenAIProvider();
        actualModelUsed = options?.model ?? "gpt-4o";
        break;
      default:
        const _exhaustiveCheck: never = providerName;
        throw new Error(
          `[${reqId}] Unsupported LLM provider: ${providerName}g`
        );
    }
  } catch (initError: any) {
    llmBaseLogger.error(
      `[${reqId}] Failed to instantiate provider ${providerName}`,
      { error: initError?.message || initError }
    );
    throw initError;
  }

  const finalModel = options?.model ?? actualModelUsed;

  while (attempt < maxRetries) {
    try {
      attempt++;
      llmBaseLogger.info(
        `[${reqId}] Attempt ${attempt}/${maxRetries}: Calling ${providerName} provider with model ${finalModel}`
      );

      const providerOptions = {
        maxRetries: 1,
        model: finalModel,
      };

      const result = await provider.generateResponse(
        prompt,
        schema,
        reqId,
        providerOptions
      );

      if (!options?.bypassCache) {
        const cacheKey = generateCacheKey(prompt, providerName, finalModel);
        if (responseCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = responseCache.keys().next().value;
          if (oldestKey) {
            responseCache.delete(oldestKey);
            llmBaseLogger.debug(
              `[${reqId}] Cache full, removed oldest entry: ${oldestKey}`
            );
          }
        }
        responseCache.set(cacheKey, {
          timestamp: Date.now(),
          result: result,
        });
        llmBaseLogger.info(
          `[${reqId}] Cached successful response for ${providerName}:${finalModel}. Cache size: ${responseCache.size}`
        );
      }

      return result;
    } catch (err: any) {
      llmBaseLogger.error(
        `[${reqId}] Attempt ${attempt}/${maxRetries} failed for ${providerName}:${finalModel}`,
        { error: err?.message || err }
      );

      if (attempt >= maxRetries) {
        llmBaseLogger.error(
          `[${reqId}] All attempts failed after ${maxRetries} retries for ${providerName}:${finalModel}.`
        );
        throw err;
      }

      const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 100;
      llmBaseLogger.info(
        `[${reqId}] Retrying after ${delay.toFixed(0)}ms delay.`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `[${reqId}] Unreachable: Failed to obtain a valid ${providerName} response after retries`
  );
}
