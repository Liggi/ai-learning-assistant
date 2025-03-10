# Migrating to Our New Domain Model

This document outlines a step-by-step plan for transitioning our codebase to match our new domain model. Rather than migrating data, we'll focus on incrementally updating the codebase while maintaining functionality throughout the process. Each step is designed to be independently verifiable.

## Current vs. Target Architecture

### Current Domain Model

- **Conversation**: Contains messages exchanged between user and AI
- **Message**: Text content with isUser flag and optional tooltips
- **Lesson**: Implicitly represented as an AI-generated message (isUser=false)
- **Layout**: Visual representation of the conversation

### Target Domain Model

- **LearningMap**: Central entity representing a user's knowledge exploration journey
- **Article**: Discrete unit of educational content (replacing AI-generated "lessons")
- **UserQuestion**: Connection between articles, representing user inquiries
- **ContextualTooltip**: Article-specific explanations for technical terms
- **SuggestedQuestion**: Ephemeral potential paths for exploration (not stored)
- **MapContext**: Flexible association between a LearningMap and any context (e.g., subject/module)

## Data Flow and API Patterns Reference

Before proceeding with the implementation plan, let's establish the architectural patterns that should be followed throughout the migration:

### Architecture Layers

1. **Service Layer** (`hooks/services/`) - Business logic, state management, and orchestration
2. **API Layer** (`hooks/api/`) - React Query hooks for data fetching and mutation
3. **Server Functions** (`prisma/*.ts`) - Data validation and database operations
4. **Data Layer** (Prisma) - Database access with typed models and serialization

### Server Function Pattern

Server functions use TanStack Start's `createServerFn` with method specification and chained API:

```typescript
export const myFunction = createServerFn({ method: "GET" })
  .validator((data: unknown) => mySchema.parse(data))
  .handler(async ({ data }) => {
    try {
      // Database operations
      return serializeResult(result);
    } catch (error) {
      logger.error("Error message", { error });
      throw error;
    }
  });
```

### React Query Hook Pattern

API hooks wrap server functions with React Query for caching and state management:

```typescript
// Query hook
export function useEntity(id: string | null) {
  return useQuery<SerializedEntity | null>({
    queryKey: id ? ["entities", id] : undefined,
    queryFn: async () => {
      if (!id) return null;
      return getEntity({ data: { id } });
    },
    enabled: !!id,
  });
}

// Mutation hook
export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedEntity,
    Error,
    { name: string /* other params */ }
  >({
    mutationFn: async (data) => {
      return createEntity({ data });
    },
    onSuccess: (entity) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
```

### Service Hook Pattern

Service hooks provide business logic layer that orchestrates API calls:

```typescript
export function useEntityService(entityId: string | null) {
  // Local state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // API hooks
  const { data: entity } = useEntity(entityId);
  const { mutateAsync: createEntityAsync } = useCreateEntity();

  // Business logic functions
  const processEntity = useCallback(
    async (params) => {
      setIsProcessing(true);
      try {
        // Perform operations with the API layer
        const result = await createEntityAsync(params);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [createEntityAsync]
  );

  return {
    entity,
    isProcessing,
    error,
    processEntity,
  };
}
```

### Serialization Pattern

Serialization functions convert Prisma objects to client-friendly format:

```typescript
export function serializeEntity(entity: Entity): SerializedEntity {
  return {
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    // Handle nested relations
    related: entity.related ? entity.related.map(serializeRelated) : [],
  };
}
```

### Important Implementation Notes

1. Server function calls always use the `{ data: { ... } }` structure
2. React Query keys should be properly handled for undefined values
3. Type safety must be maintained throughout all layers
4. Error handling should be consistent across all functions
5. Serialization should convert all Date objects to ISO strings
6. Relations should be properly included and serialized

## Implementation Plan

### Phase 1: Schema Restructuring

#### Step 1: Define New Prisma Schema

Create a new schema that aligns with our domain model:

```prisma
model LearningMap {
  id        String       @id @default(uuid())
  title     String       // Descriptive title for the learning map
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  articles  Article[]
  questions UserQuestion[]
  contexts  MapContext[]
  layout    Layout?
}

model MapContext {
  id            String      @id @default(uuid())
  learningMapId String
  contextKey    String      // Flexible identifier (e.g., "subject-module:123-456")
  metadata      Json        // Any context-specific data
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  learningMap   LearningMap @relation(fields: [learningMapId], references: [id], onDelete: Cascade)

  @@unique([contextKey]) // Only one map per specific context
}

model Article {
  id                 String              @id @default(uuid())
  content            String              // The actual educational content
  learningMapId      String
  isOrigin           Boolean             // Whether this is the starting article
  contextualTooltips ContextualTooltip[]
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  learningMap        LearningMap         @relation(fields: [learningMapId], references: [id], onDelete: Cascade)
  incomingQuestions  UserQuestion[]      @relation("QuestionToDestination")
  outgoingQuestions  UserQuestion[]      @relation("QuestionToSource")
}

model UserQuestion {
  id             String      @id @default(uuid())
  content        String      // The question text
  learningMapId  String
  sourceId       String      // Article where question was asked
  destinationId  String      // Article that answers the question
  isImplicit     Boolean     @default(false) // Whether user explicitly asked or followed suggestion
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  learningMap    LearningMap @relation(fields: [learningMapId], references: [id], onDelete: Cascade)
  source         Article     @relation("QuestionToSource", fields: [sourceId], references: [id], onDelete: Cascade)
  destination    Article     @relation("QuestionToDestination", fields: [destinationId], references: [id], onDelete: Cascade)
}

model ContextualTooltip {
  id          String   @id @default(uuid())
  term        String   // The highlighted term
  explanation String   // Context-specific explanation
  articleId   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  article     Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
}

model Layout {
  id            String      @id @default(uuid())
  learningMapId String      @unique
  nodePositions Json        // Map of articleId/questionId to position {x, y}
  nodeHeights   Json        // Map of articleId/questionId to height
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  learningMap   LearningMap @relation(fields: [learningMapId], references: [id], onDelete: Cascade)
}
```

**Verification**: Run migrations to create the new schema. Verify it creates the expected tables.

#### Step 2: Create Type Definitions and Serialization Functions

Create new TypeScript interfaces and Zod schemas for the domain entities:

```typescript
// In types/learning-map.ts
export type SerializedLearningMap = {
  id: string;
  title: string;
  articles: SerializedArticle[];
  questions: SerializedUserQuestion[];
  contexts: SerializedMapContext[];
  createdAt: string;
  updatedAt: string;
};

export type SerializedMapContext = {
  id: string;
  learningMapId: string;
  contextKey: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type SerializedArticle = {
  id: string;
  content: string;
  learningMapId: string;
  isOrigin: boolean;
  contextualTooltips: SerializedContextualTooltip[];
  createdAt: string;
  updatedAt: string;
};

export type SerializedUserQuestion = {
  id: string;
  content: string;
  learningMapId: string;
  sourceId: string;
  destinationId: string;
  isImplicit: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SerializedContextualTooltip = {
  id: string;
  term: string;
  explanation: string;
  articleId: string;
  createdAt: string;
  updatedAt: string;
};

// Layout types
export type NodePosition = {
  x: number;
  y: number;
};

export type SerializedLayout = {
  id: string;
  learningMapId: string;
  nodePositions: Record<string, NodePosition>; // Map of entity ID to position
  nodeHeights: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};
```

**Verification**: Compile TypeScript to ensure types are valid.

### Phase 2: Core Service Implementation

#### Step 3: Implement Server Functions

Create server functions for the LearningMap domain:

```typescript
// In prisma/learning-map.ts
export const createLearningMap = createServerFn({ method: "POST" })
  .validator((data: unknown) => createLearningMapSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedLearningMap> => {
    try {
      const learningMap = await prisma.learningMap.create({
        data: {
          title: data.title,
        },
        include: {
          articles: { include: { contextualTooltips: true } },
          questions: true,
          contexts: true,
        },
      });

      return serializeLearningMap(learningMap);
    } catch (error) {
      logger.error("Failed to create learning map", { error });
      throw error;
    }
  });
```

**Verification**: Write a test script that calls these server functions directly.

#### Step 4: Implement API Hooks

Create React Query hooks for the LearningMap domain:

```typescript
// In hooks/api/use-learning-map.ts
export function useLearningMap(id: string | null) {
  return useQuery<SerializedLearningMap | null>({
    queryKey: id ? ["learning-maps", id] : undefined,
    queryFn: async () => {
      if (!id) return null;
      return getLearningMap({ data: { id } });
    },
    enabled: !!id,
  });
}

export function useCreateLearningMap() {
  const queryClient = useQueryClient();

  return useMutation<SerializedLearningMap, Error, { title: string }>({
    mutationFn: async (data) => {
      return createLearningMap({ data });
    },
    onSuccess: (learningMap) => {
      queryClient.invalidateQueries({ queryKey: ["learning-maps"] });
    },
  });
}
```

**Verification**: Create a test component that uses these hooks.

#### Step 5: Implement LearningMapService

Create a service for managing LearningMaps:

```typescript
// In hooks/services/use-learning-map-service.ts
export function useLearningMapService() {
  const [learningMapId, setLearningMapId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // API hooks
  const { data: learningMap } = useLearningMap(learningMapId);
  const { mutateAsync: createMapWithContextAsync } =
    useCreateLearningMapWithContext();

  // Initialize for a specific context
  const initialize = useCallback(
    async (
      contextKey: string,
      title: string,
      metadata: Record<string, any> = {}
    ) => {
      try {
        // First check if a learning map exists for this context
        const existingContext = await findMapContext({ data: { contextKey } });

        if (existingContext) {
          // Get the associated learning map
          const learningMap = await getLearningMap({
            data: { id: existingContext.learningMapId },
          });

          setLearningMapId(learningMap.id);
          setIsInitialized(true);
          return learningMap.id;
        }

        // Create a new learning map with context
        const newMap = await createMapWithContextAsync({
          title,
          contextKey,
          metadata,
        });

        setLearningMapId(newMap.id);
        setIsInitialized(true);
        return newMap.id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [createMapWithContextAsync]
  );

  return {
    learningMapId,
    learningMap,
    isInitialized,
    error,
    initialize,
  };
}
```

**Verification**: Create a test component that uses the service.

### Phase 3: Building the Orchestrator

#### Step 6: Create Learning Orchestrator

Build an orchestrator that connects the various services:

```typescript
// In hooks/orchestration/use-learning-orchestrator.ts
export function useLearningOrchestrator(
  subjectId: string,
  moduleId: string,
  moduleTitle: string,
  moduleDescription: string
) {
  const learningMapService = useLearningMapService();
  const articleService = useArticleService(learningMapService.learningMapId);
  const tooltipService = useContextualTooltipService(
    articleService.currentArticleId
  );
  const questionService = useUserQuestionService(
    learningMapService.learningMapId,
    articleService.currentArticleId
  );
  const suggestedQuestionService = useSuggestedQuestionService();
  const visualizationService = useLearningMapVisualizationService(
    learningMapService.learningMapId
  );

  // Initialization logic
  // ...

  return {
    // Service exports
    // ...
  };
}
```

**Verification**: Create a test component that uses the orchestrator.

### Phase 4: Implementing Article Service

#### Step 7: Create Article Service

```typescript
// In hooks/services/use-article-service.ts
export function useArticleService(learningMapId: string | null) {
  // State and API hooks
  // ...

  // Stream article content
  const generateArticle = useCallback(
    async (moduleDetails: ModuleDetails) => {
      if (!learningMapId) {
        throw new Error("Cannot generate article: No active learning map");
      }

      try {
        setIsGenerating(true);

        // Call stream API
        const { content, articleId } = await streamArticleContentAsync({
          learningMapId,
          moduleDetails,
          isOrigin: true,
        });

        setContent(content);
        setDisplayContent(content);
        setCurrentArticleId(articleId);
        return { content, articleId };
      } catch (err) {
        // Error handling
      } finally {
        setIsGenerating(false);
      }
    },
    [learningMapId, streamArticleContentAsync]
  );

  return {
    // Service exports
    // ...
  };
}
```

**Verification**: Add to orchestrator and test article generation.

### Phase 5-9: Remaining Implementation

(Continue with the remaining implementation phases as outlined earlier...)

## Conclusion

This implementation plan provides a step-by-step approach to migrating our codebase to the new domain model. By following the established architectural patterns and maintaining consistency across layers, we'll ensure a smooth transition while maintaining functionality throughout the process.

The reference section provides clear guidelines for implementing each layer correctly, helping to maintain consistency and avoid common pitfalls during the migration process.
