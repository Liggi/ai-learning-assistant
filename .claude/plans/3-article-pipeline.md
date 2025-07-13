# Project 3: Article Pipeline Orchestration

## Overview
Formalize the article content generation pipeline that orchestrates article creation → summary generation → tooltip creation in a reliable, observable, and efficient manner. This builds on Projects 1 (Helicone) and 2 (Robust LLM calls) to create a complete content generation workflow.

## Goals
- **Correct Async Orchestration**: Ensure summary completes before tooltips begin
- **Parallel Efficiency**: Generate multiple tooltips concurrently where possible
- **Pipeline Correlation**: Track related requests together in observability
- **Error Recovery**: Handle partial failures gracefully
- **Result Consistency**: Standardized API contracts for all pipeline outputs
- **Resource Management**: Respect rate limits and concurrency constraints

## Current State Analysis
Currently the app has:
- Individual generators in `features/generators/`
- Article creation through chat interface
- Basic tooltip generation
- Summary generation 
- Separate, uncoordinated LLM calls

## Pipeline Architecture

```
Article Creation
       ↓
Summary Generation (required)
       ↓
Parallel Tooltip Generation (for each concept)
       ↓
Final Result Assembly
```

## Implementation Plan

### Phase 1: Pipeline Orchestrator

1. **Create `lib/article-pipeline.ts`**
   ```ts
   import { robustLLMCall } from './robust-llm-call';
   import { Logger } from './logger';
   import pLimit from 'p-limit';

   const logger = new Logger({ context: 'ArticlePipeline' });

   interface PipelineInput {
     articleId: string;
     content: string;
     subjectId: string;
     concepts?: string[];
     generateTooltips?: boolean;
   }

   interface PipelineResult {
     summary: string;
     tooltips: Array<{
       concept: string;
       explanation: string;
       position?: { start: number; end: number };
     }>;
     metadata: {
       pipelineId: string;
       duration: number;
       tokensUsed: number;
       requestCount: number;
     };
   }

   export class ArticlePipeline {
     private readonly concurrencyLimit = pLimit(5); // Max 5 concurrent tooltip requests
     
     async process(input: PipelineInput): Promise<PipelineResult> {
       const pipelineId = this.generatePipelineId(input.articleId);
       const startTime = Date.now();
       let totalTokens = 0;
       let requestCount = 0;

       logger.info('Starting article pipeline', {
         pipelineId,
         articleId: input.articleId,
         subjectId: input.subjectId,
         contentLength: input.content.length,
         conceptCount: input.concepts?.length || 0
       });

       try {
         // Phase 1: Generate Summary (required first)
         const summaryResult = await this.generateSummary(input, pipelineId);
         totalTokens += summaryResult.tokens || 0;
         requestCount++;

         // Phase 2: Generate Tooltips (parallel, depends on summary)
         let tooltips: PipelineResult['tooltips'] = [];
         if (input.generateTooltips && input.concepts?.length) {
           const tooltipResults = await this.generateTooltips(
             input,
             summaryResult.summary,
             pipelineId
           );
           tooltips = tooltipResults.tooltips;
           totalTokens += tooltipResults.totalTokens;
           requestCount += tooltipResults.requestCount;
         }

         const duration = Date.now() - startTime;
         
         logger.info('Pipeline completed successfully', {
           pipelineId,
           articleId: input.articleId,
           duration,
           totalTokens,
           requestCount,
           tooltipCount: tooltips.length
         });

         return {
           summary: summaryResult.summary,
           tooltips,
           metadata: {
             pipelineId,
             duration,
             tokensUsed: totalTokens,
             requestCount
           }
         };

       } catch (error) {
         const duration = Date.now() - startTime;
         logger.error('Pipeline failed', {
           pipelineId,
           articleId: input.articleId,
           duration,
           error: error instanceof Error ? error.message : 'Unknown error'
         });
         throw error;
       }
     }

     private async generateSummary(input: PipelineInput, pipelineId: string) {
       return robustLLMCall(
         () => this.callSummaryAPI(input.content),
         {
           requestType: 'summary',
           metadata: {
             pipelineId,
             articleId: input.articleId,
             subjectId: input.subjectId,
             stage: 'summary',
             sequence: 1
           }
         }
       );
     }

     private async generateTooltips(
       input: PipelineInput,
       summary: string,
       pipelineId: string
     ) {
       const concepts = input.concepts || [];
       
       // Generate tooltips with concurrency control
       const tooltipPromises = concepts.map((concept, index) =>
         this.concurrencyLimit(() =>
           robustLLMCall(
             () => this.callTooltipAPI(concept, summary, input.content),
             {
               requestType: 'tooltip',
               metadata: {
                 pipelineId,
                 articleId: input.articleId,
                 subjectId: input.subjectId,
                 stage: 'tooltip',
                 sequence: index + 2, // +2 because summary is sequence 1
                 concept,
                 conceptIndex: index
               }
             }
           )
         )
       );

       const results = await Promise.allSettled(tooltipPromises);
       
       // Handle partial failures gracefully
       const tooltips: PipelineResult['tooltips'] = [];
       let totalTokens = 0;
       let successCount = 0;

       results.forEach((result, index) => {
         if (result.status === 'fulfilled') {
           tooltips.push({
             concept: concepts[index],
             explanation: result.value.content,
             position: this.findConceptPosition(input.content, concepts[index])
           });
           totalTokens += result.value.usage?.totalTokens || 0;
           successCount++;
         } else {
           logger.warn('Tooltip generation failed', {
             pipelineId,
             concept: concepts[index],
             error: result.reason?.message || 'Unknown error'
           });
         }
       });

       logger.info('Tooltip generation completed', {
         pipelineId,
         requestedCount: concepts.length,
         successCount,
         failureCount: concepts.length - successCount,
         totalTokens
       });

       return {
         tooltips,
         totalTokens,
         requestCount: concepts.length
       };
     }

     private generatePipelineId(articleId: string): string {
       return `pipeline_${articleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     }

     private findConceptPosition(content: string, concept: string) {
       const start = content.toLowerCase().indexOf(concept.toLowerCase());
       if (start === -1) return undefined;
       return { start, end: start + concept.length };
     }

     private async callSummaryAPI(content: string) {
       // Import and call existing summary generator
       const { generate } = await import('@/features/generators/article-summary');
       return generate({ data: { content } });
     }

     private async callTooltipAPI(concept: string, summary: string, content: string) {
       // Import and call existing tooltip generator
       const { generate } = await import('@/features/generators/tooltips');
       return generate({ 
         data: { 
           concept, 
           summary, 
           content,
           concepts: [concept] // Single concept for individual tooltip
         } 
       });
     }
   }
   ```

### Phase 2: Integrate with Existing Generators

1. **Update Summary Generator (`features/generators/article-summary.ts`)**
   ```ts
   export const generate = createServerFn({ method: "POST" })
     .validator(articleSummarySchema)
     .handler(async ({ data }) => {
       const result = await robustLLMCall(
         () => anthropicProvider.generateResponse(
           createSummaryPrompt(data.content),
           summaryResponseSchema
         ),
         {
           requestType: 'summary',
           metadata: {
             articleId: data.articleId,
             contentLength: data.content.length
           }
         }
       );

       return {
         summary: result.content,
         tokens: result.usage?.totalTokens
       };
     });
   ```

2. **Update Tooltip Generator (`features/generators/tooltips.ts`)**
   ```ts
   export const generate = createServerFn({ method: "POST" })
     .validator(tooltipGenerationSchema)
     .handler(async ({ data }) => {
       const { concept, summary, content } = data;
       
       const result = await robustLLMCall(
         () => anthropicProvider.generateResponse(
           createTooltipPrompt(concept, summary, content),
           tooltipResponseSchema
         ),
         {
           requestType: 'tooltip',
           metadata: {
             concept,
             summaryLength: summary.length,
             contentLength: content.length
           }
         }
       );

       return {
         explanation: result.content,
         concept,
         tokens: result.usage?.totalTokens
       };
     });
   ```

### Phase 3: Pipeline API Endpoints

1. **Create `app/routes/api/article-pipeline.ts`**
   ```ts
   import { createServerFn } from "@tanstack/react-start";
   import { z } from "zod";
   import { ArticlePipeline } from "@/lib/article-pipeline";
   import { Logger } from "@/lib/logger";

   const logger = new Logger({ context: "ArticlePipelineAPI" });

   const pipelineRequestSchema = z.object({
     articleId: z.string(),
     content: z.string().min(1),
     subjectId: z.string(),
     concepts: z.array(z.string()).optional(),
     generateTooltips: z.boolean().default(true)
   });

   export const processArticle = createServerFn({ method: "POST" })
     .validator(pipelineRequestSchema)
     .handler(async ({ data }) => {
       const pipeline = new ArticlePipeline();
       
       try {
         const result = await pipeline.process(data);
         
         // Optionally save to database
         if (data.articleId) {
           await saveArticleResults(data.articleId, result);
         }
         
         return result;
       } catch (error) {
         logger.error('Pipeline API failed', {
           articleId: data.articleId,
           error: error instanceof Error ? error.message : 'Unknown error'
         });
         throw error;
       }
     });

   async function saveArticleResults(articleId: string, result: any) {
     // Update article with summary and tooltips
     const { prisma } = await import('@/lib/prisma');
     await prisma.article.update({
       where: { id: articleId },
       data: {
         summary: result.summary,
         tooltips: result.tooltips
       }
     });
   }
   ```

2. **Create Streaming Pipeline API**
   ```ts
   // app/routes/api/article-pipeline-stream.ts
   export const processArticleStream = createServerFn({ method: "POST" })
     .validator(pipelineRequestSchema)
     .handler(async ({ data }) => {
       const stream = new ReadableStream({
         async start(controller) {
           const pipeline = new ArticlePipeline();
           
           try {
             // Send initial status
             controller.enqueue(JSON.stringify({
               type: 'status',
               stage: 'starting',
               pipelineId: pipeline.generatePipelineId(data.articleId)
             }) + '\n');

             // Generate summary
             controller.enqueue(JSON.stringify({
               type: 'status',
               stage: 'summary',
               message: 'Generating article summary...'
             }) + '\n');

             const summaryResult = await pipeline.generateSummary(data);
             
             controller.enqueue(JSON.stringify({
               type: 'result',
               stage: 'summary',
               data: { summary: summaryResult.summary }
             }) + '\n');

             // Generate tooltips if requested
             if (data.generateTooltips && data.concepts?.length) {
               controller.enqueue(JSON.stringify({
                 type: 'status',
                 stage: 'tooltips',
                 message: `Generating ${data.concepts.length} tooltips...`
               }) + '\n');

               const tooltipResults = await pipeline.generateTooltips(data, summaryResult.summary);
               
               controller.enqueue(JSON.stringify({
                 type: 'result',
                 stage: 'tooltips',
                 data: { tooltips: tooltipResults.tooltips }
               }) + '\n');
             }

             controller.enqueue(JSON.stringify({
               type: 'complete',
               stage: 'finished'
             }) + '\n');

           } catch (error) {
             controller.enqueue(JSON.stringify({
               type: 'error',
               message: error instanceof Error ? error.message : 'Pipeline failed'
             }) + '\n');
           } finally {
             controller.close();
           }
         }
       });

       return new Response(stream, {
         headers: {
           'Content-Type': 'text/plain',
           'Transfer-Encoding': 'chunked'
         }
       });
     });
   ```

### Phase 4: Integration with Existing Components

1. **Update Article Creation Flow**
   ```ts
   // In components/streaming-article-display/streaming-article-display.tsx
   import { processArticle } from '@/app/routes/api/article-pipeline';

   export default function StreamingArticleDisplay({ article, subject }) {
     const [pipelineState, setPipelineState] = useState({
       summary: '',
       tooltips: [],
       isProcessing: false
     });

     useEffect(() => {
       if (article.content && !article.summary) {
         processPipeline();
       }
     }, [article.content]);

     const processPipeline = async () => {
       setPipelineState(prev => ({ ...prev, isProcessing: true }));
       
       try {
         const result = await processArticle({
           articleId: article.id,
           content: article.content,
           subjectId: subject.id,
           concepts: extractConcepts(article.content),
           generateTooltips: true
         });

         setPipelineState({
           summary: result.summary,
           tooltips: result.tooltips,
           isProcessing: false
         });
       } catch (error) {
         console.error('Pipeline failed:', error);
         setPipelineState(prev => ({ ...prev, isProcessing: false }));
       }
     };

     // Render with pipeline results...
   }
   ```

### Phase 5: Error Recovery and Monitoring

1. **Partial Failure Handling**
   ```ts
   interface PipelineOptions {
     retryFailedTooltips?: boolean;
     maxTooltipFailures?: number;
     fallbackToBasicSummary?: boolean;
   }

   export class ArticlePipeline {
     async processWithRecovery(input: PipelineInput, options: PipelineOptions = {}) {
       const {
         retryFailedTooltips = true,
         maxTooltipFailures = 3,
         fallbackToBasicSummary = true
       } = options;

       try {
         return await this.process(input);
       } catch (error) {
         logger.warn('Pipeline failed, attempting recovery', { error });

         // If summary fails, try basic extraction
         if (fallbackToBasicSummary) {
           const basicSummary = this.extractBasicSummary(input.content);
           return {
             summary: basicSummary,
             tooltips: [],
             metadata: {
               pipelineId: this.generatePipelineId(input.articleId),
               duration: 0,
               tokensUsed: 0,
               requestCount: 0,
               recovered: true
             }
           };
         }

         throw error;
       }
     }

     private extractBasicSummary(content: string): string {
       // Extract first paragraph or first 150 words as fallback
       const sentences = content.split('.').slice(0, 3);
       return sentences.join('.') + '.';
     }
   }
   ```

2. **Pipeline Monitoring Dashboard Data**
   ```ts
   // lib/pipeline-metrics.ts
   export interface PipelineMetrics {
     pipelineId: string;
     articleId: string;
     startTime: number;
     endTime?: number;
     stages: Array<{
       name: string;
       startTime: number;
       endTime?: number;
       success: boolean;
       tokens?: number;
       error?: string;
     }>;
     totalTokens: number;
     totalRequests: number;
     success: boolean;
   }

   export function trackPipelineMetrics(metrics: PipelineMetrics) {
     // Send to analytics/monitoring system
     // This data will also be visible in Helicone dashboard
   }
   ```

## Testing Strategy

1. **Unit Tests for Pipeline**
   ```ts
   describe('ArticlePipeline', () => {
     it('should process article with summary and tooltips', async () => {
       const pipeline = new ArticlePipeline();
       const result = await pipeline.process({
         articleId: 'test-article',
         content: 'Machine learning is a subset of artificial intelligence...',
         subjectId: 'ai-101',
         concepts: ['machine learning', 'artificial intelligence'],
         generateTooltips: true
       });

       expect(result.summary).toBeTruthy();
       expect(result.tooltips).toHaveLength(2);
       expect(result.metadata.pipelineId).toBeTruthy();
     });

     it('should handle tooltip failures gracefully', async () => {
       // Mock partial failures and verify graceful degradation
     });
   });
   ```

2. **Integration Tests**
   - Test full pipeline with real API calls
   - Verify Helicone logging
   - Test error recovery scenarios
   - Performance testing under load

## Success Criteria
- ✅ Summary always generates before tooltips
- ✅ Tooltips generate in parallel with concurrency limits
- ✅ Pipeline correlation visible in Helicone dashboard
- ✅ Graceful handling of partial failures
- ✅ Consistent API contract for all consumers
- ✅ Rate limit compliance across all requests
- ✅ Complete observability for debugging
- ✅ Sub-second response time for summary
- ✅ <30 second total pipeline time for 10 tooltips

## Migration Strategy
1. Implement pipeline orchestrator
2. Create new API endpoints
3. Test with existing article flow
4. Gradually migrate components to use pipeline API
5. Add monitoring and alerting
6. Optimize performance based on metrics
7. Remove old individual generator calls

## Future Enhancements
1. **Caching Layer**: Cache summaries and tooltips for identical content
2. **Quality Scoring**: Rate generated content quality
3. **A/B Testing**: Test different prompt strategies
4. **Batch Processing**: Process multiple articles in one pipeline
5. **Real-time Updates**: WebSocket-based progress updates