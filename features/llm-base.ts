import { z } from "zod";

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
  const jsonRegex = /{[\s\S]*}/;
  const match = str.match(jsonRegex);
  return match ? match[0] : str;
}
