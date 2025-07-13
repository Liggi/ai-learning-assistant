import pRetry from 'p-retry';
import { Logger } from './logger';

const logger = new Logger({ context: 'RobustLLMCall' });

interface LLMCallOptions {
  retries?: number;
  timeout?: number;
  provider?: 'openai' | 'anthropic';
  requestType?: string;
  metadata?: Record<string, any>;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  model?: string;
  finishReason?: string;
}

export async function robustLLMCall<T = LLMResponse>(
  fn: () => Promise<any>,
  options: LLMCallOptions = {}
): Promise<T> {
  const {
    retries = 3,
    timeout = 60000,
    provider,
    requestType = 'unknown',
    metadata = {}
  } = options;

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const contextLogger = new Logger({ 
    context: 'RobustLLMCall',
    metadata: { requestId, requestType, provider, ...metadata }
  });

  const startTime = Date.now();

  return pRetry(async (attemptNumber) => {
    contextLogger.info(`LLM call attempt ${attemptNumber}`, { 
      provider, 
      requestType,
      attempt: attemptNumber 
    });

    try {
      const response = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      const parsed = parseResponse(response, provider) as T;
      const duration = Date.now() - startTime;

      contextLogger.info('LLM call successful', {
        provider,
        requestType,
        duration,
        tokens: (parsed as any).usage?.totalTokens,
        model: (parsed as any).model
      });

      return parsed;
    } catch (error) {
      const duration = Date.now() - startTime;
      contextLogger.warn(`LLM call failed (attempt ${attemptNumber})`, {
        provider,
        requestType,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: attemptNumber
      });
      throw error;
    }
  }, {
    retries,
    onFailedAttempt: async (error) => {
      if (isRateLimitError(error)) {
        const retryAfter = extractRetryAfter(error);
        if (retryAfter) {
          contextLogger.info(`Rate limited, waiting ${retryAfter}ms`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
        }
      }
    },
    shouldRetry: (error) => {
      return isRetriableError(error);
    }
  });
}

function parseResponse(response: any, provider?: string): LLMResponse {
  // OpenAI format
  if (response?.choices?.[0]?.message?.content) {
    return {
      content: response.choices[0].message.content,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined,
      model: response.model,
      finishReason: response.choices[0].finish_reason
    };
  }

  // Anthropic format
  if (response?.content?.[0]?.text) {
    return {
      content: response.content[0].text,
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      } : undefined,
      model: response.model,
      finishReason: response.stop_reason
    };
  }

  // Anthropic multiple content blocks
  if (response?.content && Array.isArray(response.content)) {
    const textBlocks = response.content.filter((block: any) => block.type === 'text');
    if (textBlocks.length > 0) {
      return {
        content: textBlocks.map((block: any) => block.text).join(''),
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        } : undefined,
        model: response.model,
        finishReason: response.stop_reason
      };
    }
  }

  // Direct string response
  if (typeof response === 'string') {
    return { content: response };
  }

  // Already parsed response (e.g., from existing generators)
  if (response?.content && typeof response.content === 'string') {
    return response;
  }

  throw new Error(`Unable to parse LLM response: ${JSON.stringify(response).substring(0, 200)}`);
}

function isRetriableError(error: any): boolean {
  // Network errors, timeouts, rate limits, server errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
  if (error.status >= 500) return true; // Server errors
  if (error.status === 429) return true; // Rate limit
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('network')) return true;
  if (error.message?.includes('ENOTFOUND')) return true;
  
  // Don't retry on authentication errors, invalid requests, etc.
  if (error.status === 401 || error.status === 403) return false;
  if (error.status === 400) return false;
  
  return false;
}

function isRateLimitError(error: any): boolean {
  return error.status === 429 || error.message?.toLowerCase().includes('rate limit');
}

function extractRetryAfter(error: any): number | null {
  const retryAfter = error.headers?.['retry-after'] || error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return seconds * 1000; // Convert to milliseconds
  }
  
  // Default backoff for rate limits
  return 1000;
}