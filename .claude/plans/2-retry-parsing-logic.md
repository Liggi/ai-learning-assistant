# Project 2: Generalized Retry and Parsing Logic

## Overview
Create a robust, reusable utility for LLM API calls that handles retries, parsing, and logging in a provider-agnostic way. This utility will be the foundation for all LLM interactions across the application.

## Goals
- **Reliable Retries**: Intelligent retry logic for transient failures
- **Safe Parsing**: Standardized extraction of content from different LLM responses
- **Clean Logging**: Consistent error and success logging
- **Provider Agnostic**: Works with OpenAI, Anthropic, and future providers
- **Reusable**: Drop-in replacement for all existing LLM calls

## Current State Analysis
Based on the codebase, we currently have:
- `features/anthropic.ts` - Anthropic provider with custom retry logic
- `features/openai.ts` - OpenAI provider
- `features/llm-base.ts` - Base LLM provider interface
- Various generators that call these providers directly

## Implementation Plan

### Phase 1: Core Utility Module

1. **Create `lib/robust-llm-call.ts`**
   ```ts
   import pRetry from 'p-retry';
   import { Logger } from './logger';

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

   export async function robustLLMCall<T>(
     fn: () => Promise<any>,
     options: LLMCallOptions = {}
   ): Promise<LLMResponse> {
     const {
       retries = 3,
       timeout = 60000,
       provider,
       requestType = 'unknown',
       metadata = {}
     } = options;

     const logger = new Logger({ 
       context: 'RobustLLMCall',
       metadata: { requestType, ...metadata }
     });

     const startTime = Date.now();

     return pRetry(async (attemptNumber) => {
       logger.info(`LLM call attempt ${attemptNumber}`, { 
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

         const parsed = parseResponse(response, provider);
         const duration = Date.now() - startTime;

         logger.info('LLM call successful', {
           provider,
           requestType,
           duration,
           tokens: parsed.usage?.totalTokens,
           model: parsed.model
         });

         return parsed;
       } catch (error) {
         const duration = Date.now() - startTime;
         logger.warn(`LLM call failed (attempt ${attemptNumber})`, {
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
       onFailedAttempt: (error) => {
         if (isRateLimitError(error)) {
           // Respect rate limit headers
           const retryAfter = extractRetryAfter(error);
           if (retryAfter) {
             logger.info(`Rate limited, waiting ${retryAfter}ms`);
             return new Promise(resolve => setTimeout(resolve, retryAfter));
           }
         }
       },
       shouldRetry: (error) => {
         // Don't retry on authentication errors, invalid requests, etc.
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

     // Direct string response
     if (typeof response === 'string') {
       return { content: response };
     }

     throw new Error(`Unable to parse LLM response: ${JSON.stringify(response)}`);
   }

   function isRetriableError(error: any): boolean {
     // Network errors, timeouts, rate limits, server errors
     if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
     if (error.status >= 500) return true; // Server errors
     if (error.status === 429) return true; // Rate limit
     if (error.message?.includes('timeout')) return true;
     return false;
   }

   function isRateLimitError(error: any): boolean {
     return error.status === 429 || error.message?.includes('rate limit');
   }

   function extractRetryAfter(error: any): number | null {
     const retryAfter = error.headers?.['retry-after'] || error.response?.headers?.['retry-after'];
     if (retryAfter) {
       const seconds = parseInt(retryAfter, 10);
       return seconds * 1000; // Convert to milliseconds
     }
     return null;
   }
   ```

2. **Install Dependencies**
   ```bash
   npm install p-retry
   ```

### Phase 2: Provider Integration

1. **Update Anthropic Provider (`features/anthropic.ts`)**
   ```ts
   import { robustLLMCall } from '@/lib/robust-llm-call';

   export class AnthropicProvider {
     async generateResponse(prompt: string, schema: any, cacheKey?: string) {
       return robustLLMCall(
         () => this.anthropic.messages.create({
           model: "claude-3-5-sonnet-20241022",
           max_tokens: 4000,
           messages: [{ role: "user", content: prompt }]
         }),
         {
           provider: 'anthropic',
           requestType: 'generate',
           metadata: { cacheKey, hasSchema: !!schema }
         }
       );
     }
   }
   ```

2. **Update OpenAI Provider (`features/openai.ts`)**
   ```ts
   import { robustLLMCall } from '@/lib/robust-llm-call';

   export async function generateWithOpenAI(prompt: string, options: any = {}) {
     return robustLLMCall(
       () => openai.chat.completions.create({
         model: "gpt-4o-mini",
         messages: [{ role: "user", content: prompt }],
         ...options
       }),
       {
         provider: 'openai',
         requestType: options.requestType || 'generate',
         metadata: options.metadata || {}
       }
     );
   }
   ```

### Phase 3: Generator Migration

1. **Update Article Summary Generator**
   ```ts
   // features/generators/article-summary.ts
   export const generateSummary = createServerFn({ method: "POST" })
     .validator(/* ... */)
     .handler(async ({ data }) => {
       const result = await robustLLMCall(
         () => anthropicProvider.generateResponse(prompt, schema),
         {
           requestType: 'summary',
           metadata: { articleId: data.articleId }
         }
       );
       
       return { summary: result.content };
     });
   ```

2. **Update Tooltip Generator**
   ```ts
   // features/generators/tooltips.ts
   export const generateTooltips = createServerFn({ method: "POST" })
     .validator(/* ... */)
     .handler(async ({ data }) => {
       const tooltipPromises = concepts.map((concept, index) =>
         robustLLMCall(
           () => anthropicProvider.generateResponse(createTooltipPrompt(concept, summary)),
           {
             requestType: 'tooltip',
             metadata: { 
               articleId: data.articleId,
               concept,
               index
             }
           }
         )
       );

       const results = await Promise.all(tooltipPromises);
       return results.map(r => r.content);
     });
   ```

3. **Update All Other Generators**
   - `features/generators/lesson.ts`
   - `features/generators/suggested-questions.ts`
   - `features/generators/knowledge-nodes.ts`
   - `features/generators/generate-image.ts`

### Phase 4: Enhanced Error Handling

1. **Custom Error Types**
   ```ts
   // lib/llm-errors.ts
   export class LLMError extends Error {
     constructor(
       message: string,
       public provider: string,
       public requestType: string,
       public originalError?: Error,
       public retryable: boolean = false
     ) {
       super(message);
       this.name = 'LLMError';
     }
   }

   export class RateLimitError extends LLMError {
     constructor(provider: string, retryAfter?: number) {
       super(`Rate limit exceeded for ${provider}`, provider, 'rate-limit', undefined, true);
       this.retryAfter = retryAfter;
     }
   }
   ```

2. **Metrics Collection**
   ```ts
   // lib/llm-metrics.ts
   interface LLMMetrics {
     requestType: string;
     provider: string;
     duration: number;
     tokens: number;
     success: boolean;
     retryCount: number;
   }

   export function recordMetric(metric: LLMMetrics) {
     // Send to analytics, logging, or monitoring system
     console.log('LLM Metric:', metric);
   }
   ```

## Concurrency Control

1. **Rate Limiting Utility**
   ```ts
   // lib/concurrency-control.ts
   import pLimit from 'p-limit';

   // Limit concurrent requests per provider
   export const openaiLimit = pLimit(10);
   export const anthropicLimit = pLimit(5);

   export function withConcurrencyLimit(provider: string) {
     const limit = provider === 'openai' ? openaiLimit : anthropicLimit;
     return (fn: () => Promise<any>) => limit(fn);
   }
   ```

## Testing Strategy

1. **Unit Tests for Utility**
   ```ts
   // __tests__/robust-llm-call.test.ts
   describe('robustLLMCall', () => {
     it('should parse OpenAI responses correctly', async () => {
       const mockResponse = {
         choices: [{ message: { content: 'test content' } }],
         usage: { total_tokens: 100 }
       };
       
       const result = await robustLLMCall(() => Promise.resolve(mockResponse));
       expect(result.content).toBe('test content');
       expect(result.usage?.totalTokens).toBe(100);
     });

     it('should retry on retriable errors', async () => {
       let attempts = 0;
       const fn = () => {
         attempts++;
         if (attempts < 3) throw new Error('Server error');
         return Promise.resolve({ choices: [{ message: { content: 'success' } }] });
       };

       const result = await robustLLMCall(fn, { retries: 3 });
       expect(result.content).toBe('success');
       expect(attempts).toBe(3);
     });
   });
   ```

2. **Integration Tests**
   - Test with actual API calls
   - Verify retry behavior
   - Test timeout handling

## Success Criteria
- ✅ All LLM calls go through robust utility
- ✅ Consistent error handling across providers
- ✅ Proper retry logic with exponential backoff
- ✅ Safe response parsing for all provider formats
- ✅ Comprehensive logging and metrics
- ✅ Rate limit respect and handling
- ✅ Timeout protection
- ✅ 100% test coverage for utility functions

## Migration Checklist
- [ ] Create robust-llm-call utility
- [ ] Update Anthropic provider
- [ ] Update OpenAI provider  
- [ ] Migrate article summary generator
- [ ] Migrate tooltip generator
- [ ] Migrate lesson generator
- [ ] Migrate suggested questions generator
- [ ] Migrate knowledge nodes generator
- [ ] Add comprehensive tests
- [ ] Update error handling throughout app
- [ ] Add metrics collection
- [ ] Document new patterns for future generators