# Conversation and Lesson Services Refactor Plan

This document outlines a step-by-step plan for refactoring the conversation and lesson services to achieve a clearer separation of concerns and improve the handling of initial visits versus return visits to conversations.

## Current Architecture

Currently, we have:

1. **Lesson Service**: Handles generating and streaming lesson content
2. **Conversation Service**: Manages conversations and messages
3. **Conversation Orchestrator**: Coordinates between services and contains business logic

The main issues with the current implementation:

- Responsibilities are not clearly separated
- Logic for saving initial messages lives in the orchestrator
- No clear mechanism for finding existing conversations by subject/module
- Return visits to conversations aren't efficiently handled

## Current Database Models and Schemas

### Database Models (Prisma Schema)

```prisma
model Conversation {
  id        String    @id @default(uuid())
  subjectId String
  moduleId  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
  layout    Layout?
}

model Message {
  id             String       @id @default(uuid())
  text           String
  isUser         Boolean
  conversationId String
  parentId       String?
  tooltips       Json?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  parent         Message?     @relation("MessageToMessage", fields: [parentId], references: [id], onDelete: SetNull)
  children       Message[]    @relation("MessageToMessage")
}

model Layout {
  id             String       @id @default(uuid())
  conversationId String       @unique
  nodes          Json
  edges          Json
  nodeHeights    Json
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

### Serialized Types

```typescript
// Serialization types
export type SerializedConversation = Omit<
  Conversation,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  messages: SerializedMessage[];
};

export type SerializedMessage = Omit<
  Message,
  "createdAt" | "updatedAt" | "tooltips"
> & {
  createdAt: string;
  updatedAt: string;
  tooltips: Record<string, string> | null;
};
```

### Validation Schemas

```typescript
// Conversation schema for validation
const getConversationSchema = z.object({
  id: z.string().uuid("Invalid conversation ID"),
});

const createConversationSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  moduleId: z.string(),
});

const addMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  text: z.string().min(1, "Message text is required"),
  isUser: z.boolean(),
  parentId: z.string().uuid("Invalid parent ID").optional(),
  tooltips: z.record(z.string(), z.string()).optional(),
});

const getMessagesSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});
```

### Key Observations

1. **No Separate Lesson Model**: Lessons are represented as AI-generated messages (where `isUser: false`) within a conversation.

2. **Message Structure**:

   - `isUser` flag distinguishes between user messages and AI responses (lessons)
   - `parentId` enables parent-child relationships for threading
   - `tooltips` stores technical term explanations as JSON

3. **Conversation Identification**:

   - Conversations are identified by a combination of `subjectId` and `moduleId`
   - There's no existing function to find a conversation by these fields

4. **Missing Schema Elements**:
   - No `isSystemPrompt` flag to distinguish system prompts from regular user messages
   - No schema for finding conversations by subject/module

## Target Architecture

We want to move to:

1. **Lesson Service**: Focused solely on generating new lesson content
2. **Conversation Service**: Handles all conversation and message persistence/retrieval
3. **Conversation Orchestrator**: Coordinates between services with minimal business logic

## Implementation Plan

### Phase 1: Enhance Conversation Service

#### Step 1: Add findBySubjectAndModule to Conversation Service

1. Create a new server function in `prisma/conversations.ts`:

   ```typescript
   export const findConversationBySubjectAndModule = createServerFn({
     method: "GET",
   })
     .validator((data: unknown) => findConversationSchema.parse(data))
     .handler(async ({ data }): Promise<SerializedConversation | null> => {
       logger.info("Finding conversation by subject and module", {
         subjectId: data.subjectId,
         moduleId: data.moduleId,
       });

       try {
         const conversation = await prisma.conversation.findFirst({
           where: {
             subjectId: data.subjectId,
             moduleId: data.moduleId,
           },
           include: { messages: true },
         });

         if (!conversation) {
           logger.info("No conversation found", {
             subjectId: data.subjectId,
             moduleId: data.moduleId,
           });
           return null;
         }

         logger.info("Conversation found", { id: conversation.id });
         return serializeConversation(conversation);
       } catch (error) {
         logger.error("Failed to find conversation", {
           error: error instanceof Error ? error.message : "Unknown error",
           subjectId: data.subjectId,
           moduleId: data.moduleId,
         });
         throw error;
       }
     });
   ```

2. Add a new React Query hook in `hooks/api/conversations.ts`:

   ```typescript
   export function useFindConversation(subjectId?: string, moduleId?: string) {
     return useQuery({
       queryKey:
         subjectId && moduleId
           ? ["conversations", "find", subjectId, moduleId]
           : undefined,
       queryFn: () =>
         findConversationBySubjectAndModule({
           data: { subjectId: subjectId!, moduleId: moduleId! },
         }),
       enabled: !!subjectId && !!moduleId,
     });
   }
   ```

3. Add the method to `useConversationService` in `hooks/services/use-conversation-service.ts`:

   ```typescript
   const findBySubjectAndModule = useCallback(
     async (
       subjectId: string,
       moduleId: string
     ): Promise<SerializedConversation | null> => {
       try {
         setError(null);

         const result = await findConversationBySubjectAndModuleAsync({
           subjectId,
           moduleId,
         });

         return result;
       } catch (err) {
         const error = err instanceof Error ? err : new Error(String(err));
         logger.error(`Failed to find conversation: ${error.message}`);
         setError(error);
         throw error;
       }
     },
     [findConversationBySubjectAndModuleAsync]
   );
   ```

4. Update the returned object to include the new method.

5. **Verification**: Create a simple test component that uses this method to find a conversation.

#### Step 2: Enhance addUserMessage and addAIResponse in Conversation Service

1. Ensure `addUserMessage` in `useConversationService` properly handles system prompts:

   ```typescript
   const addUserMessage = useCallback(
     async (
       text: string,
       parentId?: string,
       isSystemPrompt = false
     ): Promise<SerializedMessage> => {
       if (!conversationId) {
         const error = new Error("Cannot add message: No active conversation");
         setError(error);
         throw error;
       }

       try {
         logger.info(
           `Adding ${isSystemPrompt ? "system" : "user"} message to conversation ${conversationId}`
         );
         setIsProcessingMessage(true);

         const message = await addMessageAsync({
           conversationId,
           text,
           isUser: true,
           parentId,
           isSystemPrompt, // Pass this to the API if needed
         });

         logger.info(
           `Added ${isSystemPrompt ? "system" : "user"} message with ID: ${message.id}`
         );
         return message;
       } catch (err) {
         const error = err instanceof Error ? err : new Error(String(err));
         logger.error(
           `Failed to add ${isSystemPrompt ? "system" : "user"} message: ${error.message}`
         );
         setError(error);
         throw error;
       } finally {
         setIsProcessingMessage(false);
       }
     },
     [conversationId, addMessageAsync]
   );
   ```

2. Ensure `addAIResponse` in `useConversationService` is robust and handles all lesson scenarios:

   ```typescript
   const addAIResponse = useCallback(
     async (
       text: string,
       parentId: string | undefined,
       tooltips?: Record<string, string>,
       requestId?: string
     ): Promise<SerializedMessage> => {
       if (!conversationId) {
         const error = new Error(
           "Cannot add AI response: No active conversation"
         );
         setError(error);
         throw error;
       }

       try {
         setIsProcessingMessage(true);

         logger.info("Saving AI response in conversation", {
           conversationId,
           parentId: parentId || "none (initial message)",
           tooltipsCount: tooltips ? Object.keys(tooltips).length : 0,
           requestId,
         });

         const message = await addMessageAsync({
           conversationId,
           text,
           isUser: false,
           parentId, // This can be undefined for the initial message
           tooltips,
         });

         logger.info(`Added AI response with ID: ${message.id}`);
         return message;
       } catch (err) {
         const error = err instanceof Error ? err : new Error(String(err));
         logger.error(`Failed to add AI response: ${error.message}`);
         setError(error);
         throw error;
       } finally {
         setIsProcessingMessage(false);
       }
     },
     [conversationId, addMessageAsync]
   );
   ```

3. Update the returned object to include these enhanced methods.

4. **Verification**: Test these methods with different scenarios (initial lesson, follow-up questions, etc.).

### Phase 2: Update Orchestrator to Use Enhanced Conversation Service

#### Step 3: Refactor initialize in Orchestrator

1. Update the `initialize` function in `useConversationOrchestrator` to use `findBySubjectAndModule`:

   ```typescript
   const initialize = useCallback(async () => {
     try {
       logger.info("Initializing conversation orchestrator", {
         subjectId,
         moduleId,
       });

       // If already initializing or initialized, prevent duplicate calls
       if (isInitializing) {
         logger.info("Initialization already in progress, skipping");
         return conversation.conversationId || "";
       }

       setIsInitializing(true);
       setError(null);

       // Check if conversation exists for this subject/module
       const existingConversation = await conversation.findBySubjectAndModule(
         subjectId,
         moduleId
       );

       if (existingConversation) {
         logger.info("Found existing conversation", {
           id: existingConversation.id,
           messageCount: existingConversation.messages?.length || 0,
         });

         // Use existing conversation
         await conversation.initialize(existingConversation.id);

         // Set flag to skip lesson streaming
         setIsExistingConversation(true);

         // Mark as initialized
         setOrchestrationState((prev) => ({
           ...prev,
           conversationInitialized: true,
           initialMessagesSaved: true, // Messages already exist
         }));

         return existingConversation.id;
       } else {
         logger.info("No existing conversation found, creating new one");

         // Create new conversation
         const conversationId = await conversation.initialize(
           subjectId,
           moduleId
         );

         // Set flag to allow lesson streaming
         setIsExistingConversation(false);

         // Mark as initialized
         setOrchestrationState((prev) => ({
           ...prev,
           conversationInitialized: true,
         }));

         return conversationId;
       }
     } catch (err) {
       const error = err instanceof Error ? err : new Error(String(err));
       logger.error(`Failed to initialize orchestrator: ${error.message}`);
       setError(error);
       throw error;
     } finally {
       setIsInitializing(false);
     }
   }, [
     subjectId,
     moduleId,
     conversation.initialize,
     conversation.findBySubjectAndModule,
     conversation.conversationId,
     isInitializing,
   ]);
   ```

2. **Verification**: Test the orchestrator with both new and existing conversations.

#### Step 4: Refactor saveInitialMessages in Orchestrator

1. Update the `saveInitialMessages` function to use the enhanced conversation service methods:

   ```typescript
   const saveInitialMessages = async () => {
     const now = Date.now();
     const state = initialMessageProcessingRef.current;

     // Skip if already in progress or other checks
     // ... (existing checks)

     logger.info(
       `Saving initial conversation messages (attempt ${state.attempts})`
     );

     try {
       // Define the initial system prompt
       const systemPrompt = `Explain ${moduleTitle} clearly for someone learning this topic. Provide helpful context and examples.`;

       // Save the initial user message (system prompt)
       const userMessage = await conversation.addUserMessage(
         systemPrompt,
         undefined,
         true
       );

       // Process tooltips for the lesson content
       await tooltips.processContent(lesson.content, tooltipContext);

       // Save the AI response with tooltips
       const aiMessage = await conversation.addAIResponse(
         lesson.content,
         userMessage.id, // Parent ID is the system prompt message
         tooltips.tooltips,
         "initial-lesson"
       );

       // Rest of the function (visualization, questions, etc.)
       // ...
     } catch (err) {
       // Error handling
       // ...
     } finally {
       // Cleanup
       // ...
     }
   };
   ```

2. **Verification**: Test the orchestrator with a new conversation and verify the initial messages are saved correctly.

### Phase 3: Improve Return Visit Experience

#### Step 5: Add isExistingConversation Flag

1. Add a new state variable to `useConversationOrchestrator`:

   ```typescript
   const [isExistingConversation, setIsExistingConversation] = useState(false);
   ```

2. This flag is now set in the updated `initialize` function from Step 3.

3. **Verification**: Test the orchestrator and verify the flag is set correctly.

#### Step 6: Skip Lesson Streaming for Existing Conversations

1. Update the lesson streaming effect in `useConversationOrchestrator`:

   ```typescript
   useEffect(() => {
     if (
       !conversation.isInitialized ||
       !conversation.conversationId ||
       lesson.isLessonReady ||
       lesson.isLoading ||
       lesson.isStreamingStarted ||
       isExistingConversation // Skip for existing conversations
     ) {
       return;
     }

     logger.info("Streaming initial lesson content", {
       conversationId: conversation.conversationId,
     });

     // Create module details object from props
     const moduleDetails = {
       subject: subjectId,
       moduleTitle,
       moduleDescription,
       message: `Explain ${moduleTitle} to a beginner developer`,
     };

     // Stream the initial lesson
     lesson.streamLesson(moduleDetails).catch((err) => {
       logger.error("Failed to stream lesson:", err);
       setError(new Error(`Failed to stream lesson: ${err.message}`));
     });
   }, [
     conversation.isInitialized,
     conversation.conversationId,
     subjectId,
     moduleTitle,
     moduleDescription,
     lesson.streamLesson,
     lesson.isLoading,
     lesson.isLessonReady,
     lesson.isStreamingStarted,
     isExistingConversation,
   ]);
   ```

2. **Verification**: Test the orchestrator with an existing conversation and verify no lesson streaming occurs.

### Phase 4: Clean Up and Optimize

#### Step 7: Refactor handleUserMessage

1. Update the `handleUserMessage` function to use a clearer flow:

   ```typescript
   const handleUserMessage = useCallback(
     async (message: string) => {
       try {
         // Create a unique request ID for this message
         const requestId = uuidv4();
         logger.info(`Processing user message with request ID: ${requestId}`);

         // Add user message to conversation
         const userMessage = await conversation.addUserMessage(message);

         // Update visualization with the new message
         await visualization.updateLayout(conversation.messages);

         // Generate AI response
         const responseText = await lesson.generateResponse(message, requestId);

         // Process tooltips for the response
         await tooltips.processContent(responseText, tooltipContext);

         // Add AI response to conversation
         const aiMessage = await conversation.addAIResponse(
           responseText,
           userMessage.id,
           tooltips.tooltips,
           requestId
         );

         // Update visualization with AI response
         await visualization.updateLayout(conversation.messages);

         // Select the most recent message
         conversation.selectMessage(aiMessage.id);
         visualization.zoomToNode(aiMessage.id);

         logger.info(
           `User message handled successfully (request ID: ${requestId})`
         );
       } catch (err) {
         const error = err instanceof Error ? err : new Error(String(err));
         logger.error(`Failed to handle user message: ${error.message}`);
         setError(error);
         throw error;
       }
     },
     [conversation, visualization, lesson, tooltips, tooltipContext]
   );
   ```

2. **Verification**: Test sending a user message and verify the flow works correctly.

#### Step 8: Add Conversation Cleanup

1. Add a cleanup method to `useConversationService`:

   ```typescript
   const cleanup = useCallback(() => {
     // Reset state
     setConversationId(null);
     setSelectedMessageId(null);
     setIsProcessingMessage(false);
     setError(null);
     setIsInitialized(false);
     isInitializedRef.current = false;
   }, []);
   ```

2. Update the returned object to include this method.

3. Add cleanup to the orchestrator's `handleRefresh` function:

   ```typescript
   const handleRefresh = useCallback(async () => {
     try {
       logger.info("Refreshing conversation");

       // Reset all services
       lesson.resetLesson();
       tooltips.resetTooltips();
       questions.resetQuestions();
       conversation.cleanup();

       // Reset orchestration state
       setIsExistingConversation(false);
       setOrchestrationState({
         tooltipsReady: false,
         questionsReady: false,
         conversationInitialized: false,
         initialMessagesSaved: false,
       });

       // Re-initialize
       await initialize();

       logger.info("Conversation refreshed successfully");
     } catch (err) {
       const error = err instanceof Error ? err : new Error(String(err));
       logger.error(`Failed to refresh conversation: ${error.message}`);
       setError(error);
       throw error;
     }
   }, [initialize, lesson, tooltips, questions, conversation]);
   ```

4. **Verification**: Test refreshing the conversation and verify all state is properly reset.

## Conclusion

This implementation plan provides a step-by-step approach to refactoring the conversation and lesson services. Each step is small and verifiable, allowing for incremental progress and testing. The end result will be a cleaner separation of concerns, with the lesson service focused on generating content and the conversation service handling all persistence and retrieval.

After completing this refactor, we'll have:

1. A more efficient return visit experience
2. Clearer service responsibilities
3. Better state management
4. Improved error handling and recovery
5. Consistent handling of all lessons (initial and follow-up)

Future enhancements could include:

- Adding conversation archiving
- Implementing conversation sharing
- Adding support for different types of lessons
- Improving performance with better caching strategies

## Proposed Schema

Based on the domain language clarification, we need to reconsider our data model to better represent the educational journey within the application.

### Domain Language Clarification

From the application's actual usage, we can identify these key concepts:

1. **Module Content**: The educational content about a specific topic within a subject
2. **Conversation**: A tree-like structure of interactions about a module
3. **Article**: A comprehensive explanation of a topic (what we're currently calling a "lesson")
4. **Question**: A user inquiry that branches the conversation
5. **Response**: An AI-generated answer to a question
6. **Tooltips**: Technical term explanations embedded in articles and responses

The current confusion stems from using "lesson" to refer to both the initial educational content and subsequent AI responses. In reality, these are different types of content with different purposes in the learning journey.

### Proposed Database Schema

```prisma
model Conversation {
  id        String    @id @default(uuid())
  subjectId String
  moduleId  String
  title     String    // Module title for reference
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  nodes     Node[]
  layout    Layout?

  @@unique([subjectId, moduleId]) // Ensure one conversation per subject/module
}

model Node {
  id             String       @id @default(uuid())
  conversationId String
  parentId       String?      // Parent node ID for tree structure
  type           NodeType     // ARTICLE, QUESTION, RESPONSE, SYSTEM_PROMPT
  content        String       // The actual text content
  tooltips       Json?        // Technical term explanations
  metadata       Json?        // Additional data like suggested questions
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  parent         Node?        @relation("NodeToNode", fields: [parentId], references: [id], onDelete: SetNull)
  children       Node[]       @relation("NodeToNode")
}

enum NodeType {
  ARTICLE       // Main educational content (formerly "lesson")
  QUESTION      // User question
  RESPONSE      // AI response to a question
  SYSTEM_PROMPT // System-generated prompt
}

model Layout {
  id             String       @id @default(uuid())
  conversationId String       @unique
  nodes          Json         // Visual node positions
  edges          Json         // Connections between nodes
  nodeHeights    Json         // Height of each node for layout
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```

### Serialized Types

```typescript
export type SerializedConversation = Omit<
  Conversation,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  nodes: SerializedNode[];
};

export type SerializedNode = Omit<
  Node,
  "createdAt" | "updatedAt" | "tooltips" | "metadata"
> & {
  createdAt: string;
  updatedAt: string;
  tooltips: Record<string, string> | null;
  metadata: NodeMetadata | null;
};

export type NodeMetadata = {
  suggestedQuestions?: string[];
  isExpanded?: boolean;
  requestId?: string;
  // Other metadata as needed
};
```

### Validation Schemas

```typescript
const nodeTypeSchema = z.enum([
  "ARTICLE",
  "QUESTION",
  "RESPONSE",
  "SYSTEM_PROMPT",
]);

const createConversationSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  moduleId: z.string(),
  title: z.string(),
});

const addNodeSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  parentId: z.string().uuid("Invalid parent ID").optional(),
  type: nodeTypeSchema,
  content: z.string().min(1, "Content is required"),
  tooltips: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const findConversationSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  moduleId: z.string(),
});
```

### Service Refactoring

#### Conversation Service

The Conversation Service would now focus on managing the conversation structure:

- `initialize(subjectId, moduleId, title)`: Create or find a conversation
- `addNode(type, content, parentId, tooltips, metadata)`: Add a node to the conversation
- `getNodes()`: Get all nodes in the conversation
- `getNodeById(nodeId)`: Get a specific node
- `getNodesByType(type)`: Get nodes of a specific type
- `getNodePath(nodeId)`: Get the path from root to a specific node

#### Content Service (formerly Lesson Service)

The Content Service would focus on generating educational content:

- `generateArticle(moduleDetails)`: Generate the main educational content
- `generateResponse(question, context)`: Generate a response to a user question
- `generateTooltips(content)`: Extract and explain technical terms
- `suggestQuestions(content)`: Generate suggested follow-up questions

#### Visualization Service

The Visualization Service would handle the visual representation:

- `updateLayout(nodes)`: Update the visual layout based on nodes
- `zoomToNode(nodeId)`: Focus the visualization on a specific node
- `getNodePosition(nodeId)`: Get the position of a node in the layout
- `expandNode(nodeId)`: Expand a collapsed node
- `collapseNode(nodeId)`: Collapse a node to save space

### User Flow Examples

#### Initial Visit

1. User selects a subject and module
2. System checks if a conversation exists
3. If not, system:
   - Creates a new conversation
   - Generates a system prompt (SYSTEM_PROMPT node)
   - Generates the main article (ARTICLE node)
   - Extracts tooltips
   - Suggests questions
   - Creates the visual layout

#### User Asks a Question

1. User submits a question
2. System:
   - Adds a QUESTION node
   - Generates a RESPONSE node
   - Updates tooltips
   - Updates suggested questions
   - Updates the visual layout

#### Return Visit

1. User returns to a subject/module
2. System:
   - Finds the existing conversation
   - Loads all nodes
   - Reconstructs the visual layout
   - No need to regenerate content

### Benefits of This Approach

1. **Clearer Domain Language**: The terms now match what they represent
2. **Better Tree Structure**: Nodes with types make the conversation tree more explicit
3. **Improved Metadata Handling**: Each node can have its own metadata
4. **More Flexible**: Can support different types of educational content
5. **Better Visualization Support**: The node structure maps directly to visual elements
6. **Simpler Return Visits**: Just load the existing conversation structure

### Migration Strategy

1. Create the new schema
2. Write a migration script to convert:
   - Conversations remain as is
   - Messages become Nodes with appropriate types
   - isUser flag becomes NodeType (QUESTION for true, ARTICLE/RESPONSE for false)
3. Update services to use the new schema
4. Update UI components to use the new terminology

### Implementation Phases

#### Phase 1: Schema Migration

1. Update Prisma schema with the new models
2. Generate migration
3. Create data migration script to convert existing data
4. Update serialization functions

#### Phase 2: Service Refactoring

1. Refactor Conversation Service to use Node concept
2. Rename Lesson Service to Content Service
3. Update service interfaces to match new domain language
4. Update Orchestrator to coordinate between services

#### Phase 3: UI Updates

1. Update UI components to use new terminology
2. Enhance visualization to leverage node types
3. Improve user experience for navigating the conversation tree
