import OpenAI from "openai";
import { z } from "zod";
import { Logger } from "@/lib/logger";
import { robustLLMCall } from "@/lib/robust-llm-call";
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
    const heliconeApiKey = process.env["HELICONE_API_KEY"];
    
    if (!apiKey) {
      openaiLogger.error("OPENAI_API_KEY is not set in environment variables");
      throw new Error("OpenAI API key is not configured");
    }
    
    if (!heliconeApiKey) {
      openaiLogger.error("HELICONE_API_KEY is not set in environment variables");
      throw new Error("Helicone API key is not configured");
    }
    
    this.client = new OpenAI({ 
      apiKey,
      baseURL: "https://oai.helicone.ai/v1",
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${heliconeApiKey}`
      }
    });
  }

  async generateResponse<T>(
    prompt: string,
    schema: z.ZodType<T>,
    requestId: string,
    options?: LLMCallOptions & OpenAIProviderOptions
  ): Promise<T> {
    const model = options?.model ?? "gpt-4o";

    const heliconeHeaders: Record<string, string> = {};
    if (options?.heliconeMetadata) {
      const metadata = options.heliconeMetadata;
      if (metadata.type) heliconeHeaders["Helicone-Property-Type"] = metadata.type;
      if (metadata.subject) heliconeHeaders["Helicone-Property-Subject"] = metadata.subject;
      if (metadata.articleId) heliconeHeaders["Helicone-Property-Article-Id"] = metadata.articleId;
      if (metadata.userId) heliconeHeaders["Helicone-User-Id"] = metadata.userId;
      if (metadata.sessionId) heliconeHeaders["Helicone-Session-Id"] = metadata.sessionId;
      if (metadata.pipelineId) heliconeHeaders["Helicone-Property-Pipeline-Id"] = metadata.pipelineId;
      if (metadata.pipelineStage) heliconeHeaders["Helicone-Property-Pipeline-Stage"] = metadata.pipelineStage;
      if (metadata.sequence !== undefined) heliconeHeaders["Helicone-Property-Sequence"] = metadata.sequence.toString();
      if (metadata.parentRequestId) heliconeHeaders["Helicone-Property-Parent-Request"] = metadata.parentRequestId;
    }

    const response = await robustLLMCall(
      () => this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
      }, {
        headers: heliconeHeaders,
      }),
      {
        provider: 'openai',
        requestType: options?.heliconeMetadata?.type || 'generate',
        retries: options?.maxRetries ?? 3,
        metadata: {
          requestId,
          model,
          promptLength: prompt.length,
        }
      }
    );

    const stringResponse = response.content;

    if (!stringResponse) {
      openaiLogger.error(`[${requestId}] No content received from OpenAI API`);
      throw new Error("Received empty response from OpenAI API");
    }

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

  async generateImages(options: {
    prompt: string;
    n?: number;
    size?: "square" | "landscape" | "portrait" | "auto";
    response_format?: "url" | "b64_json";
    user?: string;
    model?: string;
    heliconeMetadata?: {
      type?: string;
      subject?: string;
      articleId?: string;
      userId?: string;
      sessionId?: string;
      pipelineId?: string;
      pipelineStage?: string;
      sequence?: number;
      parentRequestId?: string;
    };
  }): Promise<Array<{ url?: string; b64_json?: string }>> {
    const model = options.model ?? "gpt-image-1";

    openaiLogger.debug(`[image] Sending image generation request`, {
      model,
      promptLength: options.prompt.length,
      n: options.n,
    });

    const sizeMap = {
      square: "1024x1024",
      landscape: "1792x1024",
      portrait: "1024x1792",
    } as const;

    const sizeParam =
      options.size && options.size !== "auto"
        ? sizeMap[options.size as keyof typeof sizeMap]
        : undefined;

    const heliconeHeaders: Record<string, string> = {};
    if (options.heliconeMetadata) {
      const metadata = options.heliconeMetadata;
      if (metadata.type) heliconeHeaders["Helicone-Property-Type"] = metadata.type;
      if (metadata.subject) heliconeHeaders["Helicone-Property-Subject"] = metadata.subject;
      if (metadata.articleId) heliconeHeaders["Helicone-Property-Article-Id"] = metadata.articleId;
      if (metadata.userId) heliconeHeaders["Helicone-User-Id"] = metadata.userId;
      if (metadata.sessionId) heliconeHeaders["Helicone-Session-Id"] = metadata.sessionId;
      if (metadata.pipelineId) heliconeHeaders["Helicone-Property-Pipeline-Id"] = metadata.pipelineId;
      if (metadata.pipelineStage) heliconeHeaders["Helicone-Property-Pipeline-Stage"] = metadata.pipelineStage;
      if (metadata.sequence !== undefined) heliconeHeaders["Helicone-Property-Sequence"] = metadata.sequence.toString();
      if (metadata.parentRequestId) heliconeHeaders["Helicone-Property-Parent-Request"] = metadata.parentRequestId;
    }

    const response = await robustLLMCall(
      () => this.client.images.generate({
        model,
        prompt: options.prompt,
        n: options.n,
        size: sizeParam,
        response_format: options.response_format,
        user: options.user,
      }, {
        headers: heliconeHeaders,
      }),
      {
        provider: 'openai',
        requestType: 'image-generation',
        retries: 3,
        metadata: {
          model,
          promptLength: options.prompt.length,
          size: sizeParam,
        }
      }
    );

    openaiLogger.debug(`[image] Received image generation response`, {
      imageCount: response.data?.length || 0,
    });

    return response.data || response;
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
