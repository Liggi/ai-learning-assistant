# Project 1: Helicone Observability Integration

## Overview
Integrate Helicone as a transparent proxy for all LLM API calls to gain comprehensive observability, logging, and analytics without changing existing business logic.

## Goals
- **Logging**: Capture all prompt/completion text automatically
- **Metadata Tagging**: Tag requests by type (summary, tooltip, article generation, etc.)
- **Analytics**: Get insights on cost, latency, volume, and usage patterns
- **Queryable History**: Search and filter requests in Helicone dashboard
- **Zero Business Logic Changes**: Pure observability layer

## Implementation Plan

### Phase 1: Basic Setup
1. **Create Helicone Account**
   - Sign up at https://helicone.ai/
   - Generate API key from Settings > API Keys
   - Choose appropriate key type (write keys start with "pk-")

2. **Environment Configuration**
   ```env
   # Add to .env
   HELICONE_API_KEY=pk-your-helicone-key
   ```

3. **Update OpenAI Configuration**
   - Modify OpenAI client initialization in `features/openai.ts`
   - Change baseURL to proxy through Helicone
   ```ts
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
     baseURL: "https://oai.helicone.ai/v1",
     defaultHeaders: {
       "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`
     }
   });
   ```

4. **Update Anthropic Configuration**
   - Modify Anthropic client in `features/anthropic.ts`
   - Use Helicone's Anthropic proxy endpoint
   ```ts
   const anthropic = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY,
     baseURL: "https://anthropic.helicone.ai/",
     defaultHeaders: {
       "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`
     }
   });
   ```

### Phase 2: Metadata Tagging
1. **Request Type Classification**
   - Add Helicone headers to categorize requests:
   ```ts
   const headers = {
     "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
     "Helicone-Property-Type": requestType, // 'summary', 'tooltip', 'article', 'questions'
     "Helicone-Property-Subject": subjectId,
     "Helicone-Property-Article-Id": articleId,
   };
   ```

2. **Update Generator Functions**
   - `features/generators/article-summary.ts`: Add type="summary"
   - `features/generators/tooltips.ts`: Add type="tooltip" 
   - `features/generators/lesson.ts`: Add type="article"
   - `features/generators/suggested-questions.ts`: Add type="questions"
   - `features/generators/knowledge-nodes.ts`: Add type="knowledge-nodes"

3. **User Context Tagging**
   - Add user identification where available
   ```ts
   "Helicone-User-Id": userId, // if available
   "Helicone-Session-Id": sessionId, // for request correlation
   ```

### Phase 3: Pipeline Correlation
1. **Pipeline Tracking**
   - Generate unique pipeline IDs for related requests
   ```ts
   const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36)}`;
   "Helicone-Property-Pipeline-Id": pipelineId,
   "Helicone-Property-Pipeline-Stage": stage, // 'summary', 'tooltip-1', 'tooltip-2'
   ```

2. **Request Sequencing**
   - Tag requests with sequence numbers for multi-step operations
   ```ts
   "Helicone-Property-Sequence": sequenceNumber,
   "Helicone-Property-Parent-Request": parentRequestId,
   ```

## Files to Modify

### Core Provider Files
- `features/openai.ts` - Update OpenAI client configuration
- `features/anthropic.ts` - Update Anthropic client configuration

### Generator Files (add headers)
- `features/generators/article-summary.ts`
- `features/generators/tooltips.ts`
- `features/generators/lesson.ts`
- `features/generators/suggested-questions.ts`
- `features/generators/knowledge-nodes.ts`
- `features/generators/generate-image.ts`

### Environment
- `.env` - Add HELICONE_API_KEY
- `app.config.ts` - Add Helicone environment validation if needed

## Testing Plan
1. **Basic Integration Test**
   - Make a simple API call
   - Verify request appears in Helicone dashboard
   - Check response is identical to direct API call

2. **Metadata Verification**
   - Generate different types of content
   - Verify proper tagging in Helicone dashboard
   - Test filtering by property types

3. **Performance Testing**
   - Measure latency impact (should be ~10ms)
   - Verify no timeout issues
   - Test under load

## Success Criteria
- ✅ All LLM requests logged in Helicone dashboard
- ✅ Zero changes to response parsing or business logic
- ✅ Proper request categorization and filtering
- ✅ Pipeline correlation for multi-step operations
- ✅ <10ms latency overhead
- ✅ Cost tracking and analytics available

## Optional Enhancements
1. **Sampling Configuration**
   ```ts
   "Helicone-Sample-Rate": "0.1", // 10% sampling for non-critical requests
   ```

2. **Custom Metrics**
   - Token usage tracking
   - Cost per request type
   - Response quality scoring

3. **Alerting Setup**
   - High error rate alerts
   - Cost threshold notifications
   - Latency spike detection

## Data Retention Policy
- **Free Tier**: 30 days retention, 10k requests/month
- **Paid Tier**: Longer retention, unlimited requests
- **Self-Hosted**: Full control over data retention

## Migration Strategy
1. Deploy with Helicone integration to staging
2. Verify 100% request capture
3. Test all existing functionality
4. Deploy to production with monitoring
5. Validate dashboard data matches expectations