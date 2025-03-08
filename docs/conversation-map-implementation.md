# Conversation Map Implementation Plan

## Current State Assessment

The application has a partially implemented conversation map feature that shows the conversation flow as a tree structure in the left sidebar. The key components and functionality exist, but they need to be integrated with our database persistence layer and the chat interface.

### Existing Progress

1. **Database Schema**: We've created Prisma models for Conversation, Message, and Layout
2. **React Query Hooks**: We've implemented hooks for conversations and messages
3. **Layout Utility**: We've moved tree layout algorithm to a utility function
4. **UI Components**: Conversation node and flow components exist but need integration
5. **Initial Custom Hooks**: Started implementing use-conversation-management.ts and use-message-handling.ts

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

1. **LessonService**: Handles lesson streaming and response generation
2. **TooltipService**: Manages tooltip generation and caching
3. **QuestionService**: Handles suggested questions generation
4. **ConversationService**: Manages conversation persistence and message operations
5. **VisualizationService**: Handles visualization of conversation as a tree structure

### Orchestration Layer

1. **ConversationOrchestrator**: Coordinates interactions between services and manages workflow dependencies

## Implementation Plan

### Phase 1: Domain Services Implementation ✅

1. **LessonService** ✅

   - Created `hooks/services/use-lesson-service.ts`
   - Refactored lesson streaming functionality from chat-layout.tsx
   - Implemented state tracking for lesson content, loading, and completion
   - Added methods for generating responses to questions
   - Added event subscription system for content completion notification

2. **TooltipService** ✅

   - Created `hooks/services/use-tooltip-service.ts`
   - Integrated with existing useTooltipGeneration hook functionality
   - Added methods for processing content and generating tooltips
   - Ensured proper caching mechanism is used
   - Fixed import issues with generateTooltips

3. **QuestionService** ✅

   - Created `hooks/services/use-question-service.ts`
   - Refactored from existing useSuggestedQuestions hook
   - Added methods for processing content and generating questions
   - Implemented state tracking for question generation

4. **ConversationService** ✅

   - Created `hooks/services/use-conversation-service.ts`
   - Integrated with React Query hooks for conversations and messages
   - Implemented conversation initialization, message adding, node selection
   - Ensured proper parent-child relationship for messages
   - Added state tracking for processing status

5. **VisualizationService** ✅
   - Created `hooks/services/use-visualization-service.ts`
   - Integrated with conversation-layout.ts utility
   - Implemented view toggling (map vs. plan)
   - Added layout persistence functionality
   - Implemented tree calculation from messages

### Phase 2: Orchestration Layer Implementation ✅

1. **ConversationOrchestrator** ✅
   - Created `hooks/orchestration/use-conversation-orchestrator.ts`
   - Integrated all domain services
   - Implemented orchestration state tracking
   - Defined workflow dependencies between services
   - Implemented event handlers for UI interactions
   - Handled proper sequencing of operations

### Phase 3: UI Refactoring ✅

1. **ChatLayout Component** ✅

   - Refactored to use the orchestration hook
   - Removed all direct service logic
   - Simplified rendering code
   - Implemented proper loading states and transitions

2. **SidebarContent Component** ✅
   - Updated to use the visualization service
   - Ensured proper rendering of conversation tree
   - Handled empty states and loading indicators

### Phase 4: Testing and Optimization (In Progress)

1. **Unit Testing**

   - Write tests for each domain service in isolation
   - Test orchestrator with mocked services
   - Ensure proper dependency handling

2. **Integration Testing**

   - Test end-to-end workflows with actual services
   - Verify conversation map updates correctly
   - Test different conversation patterns

3. **Performance Optimization**
   - Implement memoization for expensive calculations
   - Optimize tree rendering for large conversations
   - Ensure smooth transitions between states

### Phase 5: Migration and Cleanup (New)

1. **Legacy Hooks Deprecation**

   - Gradually deprecate and remove old hooks as they're replaced
   - Add deprecation notices to old hooks
   - Ensure no regressions during migration

2. **Documentation**

   - Add JSDoc comments to all service interfaces and methods
   - Create diagrams showing service relationships
   - Add examples for common usage patterns

3. **Error Handling Improvements**
   - Add more granular error states to each service
   - Implement retry mechanisms for transient failures
   - Add user-friendly error messages and recovery options

### Phase 6: Feature Enhancements (New)

1. **Conversation Export/Import**

   - Add ability to export conversations as JSON
   - Allow importing previous conversations
   - Implement sharing functionality

2. **Advanced Visualization**

   - Add zoom controls to conversation map
   - Implement node collapsing for large trees
   - Add visual indicators for active threads

3. **Offline Support**
   - Implement offline caching for active conversations
   - Add synchronization when coming back online
   - Provide feedback for offline status

## Current Status

We have successfully implemented all domain services, the orchestration layer, and refactored the UI components to use our new architecture. The application now has a clear separation of concerns with each service handling a specific domain of functionality. The orchestrator manages dependencies between services and coordinates workflows.

## Next Steps

1. Begin Phase 4 by implementing unit tests for each service
2. Review performance of tree visualization for large conversations
3. Add JSDoc comments to all services for better documentation
4. Address any edge cases or bugs discovered during testing
5. Plan for Phase 5 migration by identifying legacy hooks that can be deprecated

## Key Advantages of the New Architecture

1. **Clear Domain Boundaries**: Each service has a focused responsibility
2. **Simple Interfaces**: Services provide easy-to-understand interfaces that hide implementation details
3. **Explicit Dependencies**: The orchestrator manages dependencies between services
4. **Maintainable Code**: The ChatLayout component is much simpler and focused on rendering
5. **Testable Components**: Services can be tested in isolation with mock dependencies
6. **Flexibility**: Easy to add new features by extending services or adding new ones
7. **Performance**: Caching is handled at the service level, improving overall performance
8. **Developer Experience**: Developers can understand the system more easily due to clear boundaries

## Detailed Service Interfaces

### LessonService

```typescript
export interface LessonService {
  // State
  content: string;
  isLoading: boolean;
  isComplete: boolean;

  // Operations
  streamLesson(moduleDetails: ModuleDetails): void;
  generateResponse(prompt: string): Promise<string>;

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
  isReady: boolean;

  // Operations
  processContent(content: string): void;
  generateTooltipsForText(text: string): Promise<Record<string, string>>;
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
  isReady: boolean;

  // Operations
  processContent(
    content: string,
    context: {
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
    }
  ): void;

  // State management
  resetQuestions(): void;
}
```

### ConversationService

```typescript
export interface ConversationService {
  // State
  conversationId: string | null;
  conversation: Conversation | null;
  messages: Message[];
  selectedMessageId: string | null;
  isProcessingMessage: boolean;

  // Operations
  initialize(subjectId: string, moduleId: string): Promise<string>;
  addUserMessage(text: string, parentId?: string): Promise<Message>;
  addAIResponse(
    text: string,
    parentId: string,
    tooltips?: Record<string, string>
  ): Promise<Message>;
  selectMessage(messageId: string): void;
}
```

### VisualizationService

```typescript
export interface VisualizationService {
  // State
  currentView: "map" | "plan";

  // Operations
  getConversationTree(messages: Message[]): { nodes: Node[]; edges: Edge[] };
  setView(view: "map" | "plan"): void;

  // Layout management
  saveLayout(conversationId: string, layout: Layout): void;
  getLayout(conversationId: string): Layout | null;
}
```

### ConversationOrchestrator

```typescript
export interface ConversationOrchestrator {
  // Services (exposed for UI rendering)
  lesson: LessonService;
  tooltips: TooltipService;
  questions: QuestionService;
  conversation: ConversationService;
  visualization: VisualizationService;

  // Orchestration state
  orchestrationState: {
    lessonReady: boolean;
    tooltipsReady: boolean;
    questionsReady: boolean;
    conversationInitialized: boolean;
    initialMessagesSaved: boolean;
  };

  // Event handlers
  handleQuestionClick: (question: string) => Promise<void>;
  handleLearnMore: (concept: string) => Promise<void>;
  handleRefresh: () => void;
  handleNodeClick: (nodeId: string) => void;
}
```
