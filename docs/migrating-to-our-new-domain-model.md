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

#### Step 3: Implement LearningMapService

Create a new service for managing LearningMaps:

```typescript
// In hooks/services/use-learning-map-service.ts
export function useLearningMapService() {
  const [learningMapId, setLearningMapId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize for a specific context
  const initialize = useCallback(
    async (
      contextKey: string,
      title: string,
      metadata: Record<string, any> = {}
    ) => {
      try {
        // First check if a learning map exists for this context
        const existingContext = await findMapContext({
          data: { contextKey },
        });

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
        const newMap = await createLearningMapWithContext({
          data: {
            title,
            contextKey,
            metadata,
          },
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
    []
  );

  // Helper for subject-module context (for backward compatibility)
  const initializeForSubjectModule = useCallback(
    async (subjectId: string, moduleId: string, title: string) => {
      const contextKey = `subject-module:${subjectId}-${moduleId}`;
      return initialize(contextKey, title, { subjectId, moduleId });
    },
    [initialize]
  );

  return {
    learningMapId,
    isInitialized,
    error,
    initialize,
    initializeForSubjectModule,
  };
}
```

**Verification**: Create a simple test component that initializes a learning map.

#### Step 4: Implement ArticleService

Create a service for managing articles:

```typescript
// In hooks/services/use-article-service.ts
export function useArticleService(learningMapId: string | null) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayContent, setDisplayContent] = useState("");
  const [content, setContent] = useState("");
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Generate origin article
  const generateOriginArticle = useCallback(
    async (moduleDetails: any) => {
      if (!learningMapId) {
        throw new Error("Cannot generate article: No active learning map");
      }

      try {
        setIsGenerating(true);

        // Start streaming content
        const { content, articleId } = await streamArticleContent({
          data: {
            learningMapId,
            moduleDetails,
            isOrigin: true,
          },
        });

        setContent(content);
        setDisplayContent(content);
        setCurrentArticleId(articleId);
        return { content, articleId };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [learningMapId]
  );

  // Other methods will be added in later steps

  return {
    isGenerating,
    displayContent,
    content,
    currentArticleId,
    error,
    generateOriginArticle,
  };
}
```

**Verification**: Create a test component that generates an origin article.

### Phase 3: Building the Orchestrator

#### Step 5: Create Learning Orchestrator

Build an orchestrator that connects the new services:

```typescript
// In hooks/orchestration/use-learning-orchestrator.ts
export function useLearningOrchestrator(
  subjectId: string,
  moduleId: string,
  moduleTitle: string,
  moduleDescription: string
) {
  const learningMap = useLearningMapService();
  const tooltips = useContextualTooltipService(learningMap.learningMapId);
  const suggestedQuestions = useSuggestedQuestionService();
  const userQuestions = useUserQuestionService(learningMap.learningMapId);

  // Only initialize article service if we have a learning map
  const article = useArticleService(learningMap.learningMapId);
  const visualization = useLearningMapVisualizationService(
    learningMap.learningMapId
  );

  const [error, setError] = useState<Error | null>(null);
  const [isExistingMap, setIsExistingMap] = useState(false);

  // Initialize the learning map
  const initialize = useCallback(async () => {
    try {
      const contextKey = `subject-module:${subjectId}-${moduleId}`;

      // Check if map exists for this context
      const existingContext = await findMapContext({
        data: { contextKey },
      });

      if (existingContext) {
        await learningMap.initialize(contextKey, moduleTitle, {
          subjectId,
          moduleId,
        });
        setIsExistingMap(true);
        return existingContext.learningMapId;
      } else {
        const mapId = await learningMap.initialize(contextKey, moduleTitle, {
          subjectId,
          moduleId,
        });
        setIsExistingMap(false);
        return mapId;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [subjectId, moduleId, moduleTitle, learningMap]);

  // Initialize on component mount
  useEffect(() => {
    initialize().catch((err) => {
      console.error("Failed to initialize learning orchestrator:", err);
    });
  }, [initialize]);

  // Generate origin article if we have a new map
  useEffect(() => {
    if (
      !learningMap.isInitialized ||
      !learningMap.learningMapId ||
      isExistingMap ||
      article.isGenerating
    ) {
      return;
    }

    const moduleDetails = {
      subject: subjectId,
      moduleTitle,
      moduleDescription,
      message: `Explain ${moduleTitle} to a beginner developer`,
    };

    article.generateOriginArticle(moduleDetails).catch((err) => {
      console.error("Failed to generate origin article:", err);
      setError(new Error(`Failed to generate article: ${err.message}`));
    });
  }, [
    learningMap.isInitialized,
    learningMap.learningMapId,
    isExistingMap,
    article.isGenerating,
    subjectId,
    moduleTitle,
    moduleDescription,
    article.generateOriginArticle,
  ]);

  return {
    learningMap,
    article,
    tooltips,
    suggestedQuestions,
    userQuestions,
    visualization,
    error,
  };
}
```

**Verification**: Create a test component that uses the orchestrator to initialize a learning map and generate an origin article.

### Phase 4: Implementing Visualization

#### Step 6: Create Learning Map Visualization Service

```typescript
// In hooks/services/use-learning-map-visualization-service.ts
export function useLearningMapVisualizationService(
  learningMapId: string | null
) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get layout data from API
  const { data: layout } = useLayout(learningMapId);
  const { mutateAsync: saveLayoutAsync } = useSaveLayout();

  // Update layout based on learning map data
  const updateLayout = useCallback(async () => {
    if (!learningMapId) {
      return;
    }

    try {
      setIsLoading(true);

      // Fetch learning map data
      const learningMap = await getLearningMap({
        data: { id: learningMapId },
      });

      // Create node positions if they don't exist
      const nodePositions = layout?.nodePositions || {};
      const nodeHeights = layout?.nodeHeights || {};

      // Create nodes for articles
      const articleNodes = learningMap.articles.map((article) => {
        // Use existing position or calculate a new one
        const position =
          nodePositions[article.id] || calculatePosition(article);

        return {
          id: article.id,
          type: "article",
          position,
          data: {
            id: article.id,
            text: article.content.substring(0, 100) + "...",
            isUser: false,
            isOrigin: article.isOrigin,
          },
        };
      });

      // Create edges from questions
      const questionEdges = learningMap.questions.map((question) => ({
        id: question.id,
        source: question.sourceId,
        target: question.destinationId,
        data: {
          text: question.content,
          isImplicit: question.isImplicit,
        },
      }));

      setNodes(articleNodes);
      setEdges(questionEdges);

      // Save updated positions to database
      const updatedPositions = articleNodes.reduce(
        (acc, node) => {
          acc[node.id] = node.position;
          return acc;
        },
        {} as Record<string, NodePosition>
      );

      await saveLayoutAsync({
        data: {
          learningMapId,
          nodePositions: updatedPositions,
          nodeHeights,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [learningMapId, layout, saveLayoutAsync]);

  // Calculate a position for a node
  const calculatePosition = useCallback((article: SerializedArticle) => {
    // Simple algorithm to position nodes in a tree-like structure
    // Origin article at the top, others branching below
    if (article.isOrigin) {
      return { x: 300, y: 100 };
    }

    // For other articles, calculate based on incoming questions
    // This is a simplified version - real implementation would be more complex
    return {
      x: 300 + (Math.random() * 400 - 200),
      y: 300 + Math.random() * 200,
    };
  }, []);

  return {
    nodes,
    edges,
    isLoading,
    error,
    updateLayout,
  };
}
```

**Verification**: Add the service to the orchestrator and test visualizing the learning map.

### Phase 5: Implementing Contextual Tooltips

#### Step 7: Create Contextual Tooltip Service

```typescript
// In hooks/services/use-contextual-tooltip-service.ts
export function useContextualTooltipService(articleId: string | null) {
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Process content to extract and explain technical terms
  const processContent = useCallback(
    async (content: string, context: any) => {
      if (!articleId) {
        throw new Error("Cannot process tooltips: No active article");
      }

      try {
        setIsGenerating(true);
        setIsReady(false);

        // Generate tooltips
        const extractedTooltips = await generateContextualTooltips({
          data: {
            articleId,
            content,
            context,
          },
        });

        setTooltips(extractedTooltips);
        setIsReady(true);
        return extractedTooltips;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [articleId]
  );

  return {
    tooltips,
    isGenerating,
    isReady,
    error,
    processContent,
  };
}
```

**Verification**: Add the service to the orchestrator and test generating tooltips.

### Phase 6: Implementing User Questions

#### Step 8: Create User Question Service

```typescript
// In hooks/services/use-user-question-service.ts
export function useUserQuestionService(
  learningMapId: string | null,
  currentArticleId: string | null
) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Ask a question that creates a new article
  const askQuestion = useCallback(
    async (question: string) => {
      if (!learningMapId || !currentArticleId) {
        throw new Error(
          "Cannot ask question: No active learning map or article"
        );
      }

      try {
        setIsProcessing(true);

        // Create user question and destination article
        const result = await createUserQuestion({
          data: {
            learningMapId,
            sourceId: currentArticleId,
            content: question,
            isImplicit: false,
          },
        });

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [learningMapId, currentArticleId]
  );

  return {
    isProcessing,
    error,
    askQuestion,
  };
}
```

**Verification**: Add the service to the orchestrator and test asking questions.

### Phase 7: Implementing Suggested Questions

#### Step 9: Create Suggested Question Service

```typescript
// In hooks/services/use-suggested-question-service.ts
export function useSuggestedQuestionService() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Generate suggested questions
  const generateQuestions = useCallback(
    async (articleId: string, content: string) => {
      try {
        setIsGenerating(true);
        setIsReady(false);

        const suggestedQuestions = await generateSuggestedQuestions({
          data: {
            articleId,
            content,
          },
        });

        setQuestions(suggestedQuestions);
        setIsReady(true);
        return suggestedQuestions;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    questions,
    isGenerating,
    isReady,
    error,
    generateQuestions,
  };
}
```

**Verification**: Add the service to the orchestrator and test generating suggested questions.

### Phase 8: UI Integration

#### Step 10: Update ChatLayout Component

Update the ChatLayout component to use the new orchestrator:

```tsx
// In components/chat-layout.tsx
const ChatLayout: React.FC<ChatLayoutProps> = ({
  moduleDetails,
  subjectId,
  moduleId,
}) => {
  const orchestrator = useLearningOrchestrator(
    subjectId,
    moduleId,
    moduleDetails.moduleTitle,
    moduleDetails.moduleDescription
  );

  const {
    learningMap,
    article,
    tooltips,
    suggestedQuestions,
    userQuestions,
    visualization,
    error: orchestratorError,
  } = orchestrator;

  // Handle user asking a question
  const handleQuestionClick = useCallback(
    async (question: string) => {
      try {
        const result = await userQuestions.askQuestion(question);
        // Update visualization after adding a question
        await visualization.updateLayout();
        return result;
      } catch (err) {
        console.error("Failed to ask question:", err);
      }
    },
    [userQuestions, visualization]
  );

  // The rest of the component using the new model directly

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Component UI using the new model */}
    </div>
  );
};
```

**Verification**: Test the updated component with the new model.

### Phase 9: Cleanup and Optimizations

#### Step 11: Remove Legacy Code

Remove old services and components that are no longer needed.

**Verification**: Ensure application still works without the legacy code.

#### Step 12: Optimize Database Queries

Improve database query performance with proper indexing and optimization.

**Verification**: Measure performance improvements.

## Conclusion

This implementation plan provides a step-by-step approach to migrating our codebase to the new domain model. Each step is designed to be independently verifiable, allowing us to maintain a working application throughout the process.

By the end of this migration, we will have:

1. A cleaner domain model that better represents the educational journey
2. More efficient and focused services
3. Better separation of concerns
4. Improved flexibility for future features

The incremental approach allows us to tackle one aspect at a time, verify it works, and then move on to the next step, reducing the risk of introducing bugs that are difficult to debug.
