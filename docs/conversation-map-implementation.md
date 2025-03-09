# Conversation Map Implementation Plan

## Current State Assessment

The application has a partially implemented conversation map feature that shows the conversation flow as a tree structure in the left sidebar. The key components and functionality exist, but they need to be integrated with our database persistence layer and the chat interface.

### Existing Progress

1. **Database Schema**: We've created Prisma models for Conversation, Message, and Layout
2. **React Query Hooks**: We've implemented hooks for conversations and messages
3. **Layout Utility**: We've moved tree layout algorithm to a utility function
4. **UI Components**: Conversation node and flow components exist but need integration
5. **Initial Custom Hooks**: Started implementing use-conversation-management.ts and use-message-handling.ts

### Implementation Progress (Updated)

1. ✅ **Database Schema**: Added Conversation, Message, and Layout models to Prisma schema
2. ✅ **ConversationService**: Implemented the service with proper state management and operations
3. ✅ **LessonService**: Replaced useStreamingLesson with a proper service-based implementation
4. ✅ **JSON Utilities**: Created type-safe JSON handling for Prisma with Zod validation
5. ✅ **React Query Hooks**: Implemented hooks for conversations with proper cache management
6. ✅ **Initial UI Integration**: Updated ChatLayout to use LessonService directly

### Current Challenges

1. The chat-layout.tsx component is cluttered with too much logic
2. There's duplication in tooltip handling
3. The linter errors show inconsistencies in how tooltips are generated
4. Dependencies between lesson streaming, tooltip generation, and question generation aren't clearly managed
5. There's no explicit orchestration of the workflows

## New Architecture Vision

We will implement a domain-driven design with deep modules that have simple interfaces but hide complex implementation details. This will be structured around:

1. **Domain-Specific Services**: Each responsible for a distinct area of functionality
2. **Orchestration Hook**: Coordinating the interactions between services
3. **Simplified UI Component**: ChatLayout should focus solely on rendering

### Domain Services

1. ✅ **LessonService**: Handles lesson streaming and response generation
2. ✅ **TooltipService**: Manages tooltip generation and caching
3. ✅ **QuestionService**: Handles suggested questions generation
4. ✅ **ConversationService**: Manages conversation persistence and message operations
5. **VisualizationService**: Handles visualization of conversation as a tree structure

### Orchestration Layer

1. **ConversationOrchestrator**: Coordinates interactions between services and manages workflow dependencies

## Implementation Plan

### Phase 1: Domain Services Implementation

1. ✅ **LessonService**

   - ✅ Created `hooks/services/use-lesson-service.ts` following Feature Hook pattern
   - ✅ Implemented streaming with AbortController for cancellation
   - ✅ Added error handling with logging
   - ✅ Added event subscription system for completion notification
   - ✅ Returning proper loading/error states for UI components

2. ✅ **TooltipService**

   - ✅ Created `hooks/services/use-tooltip-service.ts` following Feature Hook pattern
   - ✅ Implemented batch processing pattern from AI integration
   - ✅ Integrated with Logger utility for structured logging
   - ✅ Used localStorage for caching processed tooltips
   - ✅ Implemented proper error handling and timeout logic
   - ✅ Added performance metrics tracking for optimization
   - ✅ Updated ChatLayout to use the TooltipService

3. ✅ **QuestionService**

   - ✅ Created `hooks/services/use-question-service.ts` following Feature Hook pattern
   - ✅ Created server function with createServerFn for question generation
   - ✅ Implemented error handling with request IDs
   - ✅ Added tracking of loading/error states for UI components
   - ✅ Added processing of content when streaming is complete
   - ✅ Updated ChatLayout to use the QuestionService

4. ✅ **ConversationService**

   - ✅ Created `hooks/services/use-conversation-service.ts` following API Hook pattern
   - ✅ Implemented Prisma models for Conversation and Message
   - ✅ Created serialization functions for Date objects
   - ✅ Created corresponding React Query hooks (useConversation, useMessages, etc.)
   - ✅ Implemented proper mutations with invalidation
   - ✅ Added structured logging with the Logger utility

5. **VisualizationService**
   - Create `hooks/services/use-visualization-service.ts` following Feature Hook pattern
   - Integrate with react-flow for visualization
   - Create server function for layout persistence
   - Implement serialization for layout data
   - Optimize node rendering for performance

### Phase 2: Orchestration Layer Implementation

1. **ConversationOrchestrator**
   - Create `hooks/orchestration/use-conversation-orchestrator.ts`
   - Implement the orchestration of all domain services
   - Follow the AI integration flow pattern for dependency management
   - Track request IDs throughout the system
   - Implement proper error handling and fallbacks
   - Coordinate the workflow between services

### Phase 3: UI Refactoring

1. **ChatLayout Component**

   - ✅ Started refactoring to use the LessonService directly
   - Focus solely on rendering, moving all logic to services
   - Implement proper loading states and transitions
   - Use shadcn/ui and Tailwind for styling

2. **SidebarContent Component**
   - Update to use the visualization service
   - Implement proper state management for tree visibility
   - Handle loading and error states consistently
   - Optimize rendering for large conversations

### Phase 4: Database Integration

1. ✅ **Schema Implementation**

   - ✅ Defined Prisma models for Conversation, Message, and Layout
   - ✅ Added appropriate relations and indexes
   - ✅ Created serialization functions for client-side data
   - ✅ Implemented type-safe JSON handling with Zod validation

2. ✅ **API Implementation**

   - ✅ Created database operations in prisma/conversations.ts
   - ✅ Implemented proper validation with Zod schemas
   - ✅ Added structured error handling and logging
   - ✅ Returning serialized data for client consumption

3. ✅ **React Query Integration**
   - ✅ Created API hooks following the naming convention
   - ✅ Implemented proper queryKey structure
   - ✅ Added mutations with optimistic updates
   - ✅ Ensured proper cache invalidation

### Phase 5: Testing and Optimization

1. **Unit Testing**

   - Test each service in isolation
   - Mock dependencies appropriately
   - Verify error handling and edge cases

2. **Integration Testing**

   - Test end-to-end workflows with actual services
   - Verify data persistence and retrieval
   - Test different conversation patterns

3. **Performance Optimization**
   - Implement memoization for expensive calculations
   - Optimize tree rendering for large conversations
   - Add pagination for message history if needed
   - Monitor and optimize API calls

### Phase 6: Documentation and Refinement

1. **Code Documentation**

   - Add comprehensive comments to all services
   - Document the orchestration patterns
   - Create type documentation for interfaces

2. **User Documentation**

   - Create guides for using the conversation map
   - Document the feature's capabilities and limitations
   - Add tooltips and help text in the UI

3. **Refinements**
   - Address any issues discovered during testing
   - Improve error messaging for better UX
   - Optimize performance bottlenecks

## Detailed Service Interfaces

### LessonService

```typescript
export interface LessonService {
  // State
  content: string;
  isLoading: boolean;
  error: Error | null;
  isComplete: boolean;

  // Operations
  streamLesson(moduleDetails: ModuleDetails): Promise<void>;
  generateResponse(prompt: string, requestId?: string): Promise<string>;

  // Event subscription
  onContentComplete(callback: (content: string) => void): () => void;

  // State management
  resetLesson(): void;
}
```

### TooltipService

```typescript
export interface TooltipService {
  // State
  tooltips: Record<string, string>;
  isGenerating: boolean;
  error: Error | null;
  isReady: boolean;

  // Operations
  processContent(content: string, subject: string): Promise<void>;
  generateTooltipsForConcepts(
    concepts: string[],
    context: TooltipContext,
    requestId?: string
  ): Promise<Record<string, string>>;
  getTooltipForConcept(concept: string): string | undefined;

  // State management
  resetTooltips(): void;
}
```

### QuestionService

```typescript
export interface QuestionService {
  // State
  questions: string[];
  isGenerating: boolean;
  error: Error | null;
  isReady: boolean;

  // Operations
  processContent(
    content: string,
    context: {
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
    },
    requestId?: string
  ): Promise<void>;

  // State management
  resetQuestions(): void;
}
```

### ConversationService

```typescript
export interface ConversationService {
  // State
  conversationId: string | null;
  messages: SerializedMessage[];
  selectedMessageId: string | null;
  isProcessingMessage: boolean;
  error: Error | null;

  // Operations
  initialize(subjectId: string, moduleId: string): Promise<string>;
  addUserMessage(text: string, parentId?: string): Promise<SerializedMessage>;
  addAIResponse(
    text: string,
    parentId: string,
    tooltips?: Record<string, string>,
    requestId?: string
  ): Promise<SerializedMessage>;
  selectMessage(messageId: string): void;
  getMessageById(messageId: string): SerializedMessage | undefined;
}
```

### VisualizationService

```typescript
export interface VisualizationService {
  // State
  currentView: "map" | "plan";
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: Error | null;

  // Operations
  calculateLayout(messages: SerializedMessage[]): {
    nodes: Node[];
    edges: Edge[];
  };
  setView(view: "map" | "plan"): void;
  zoomToNode(nodeId: string): void;

  // Layout management
  saveLayout(conversationId: string, layout: SerializedLayout): Promise<void>;
  getLayout(conversationId: string): Promise<SerializedLayout | null>;
}
```

### ConversationOrchestrator

```typescript
export interface ConversationOrchestrator {
  // Services
  lesson: LessonService;
  tooltips: TooltipService;
  questions: QuestionService;
  conversation: ConversationService;
  visualization: VisualizationService;

  // Orchestration state
  isInitializing: boolean;
  error: Error | null;
  orchestrationState: {
    lessonReady: boolean;
    tooltipsReady: boolean;
    questionsReady: boolean;
    conversationInitialized: boolean;
    initialMessagesSaved: boolean;
  };

  // Event handlers
  handleQuestionClick: (question: string) => Promise<void>;
  handleUserMessage: (message: string) => Promise<void>;
  handleLearnMore: (concept: string) => Promise<void>;
  handleRefresh: () => Promise<void>;
  handleNodeClick: (nodeId: string) => void;
}
```
