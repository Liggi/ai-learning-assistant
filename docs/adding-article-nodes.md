# Implementation Plan: Adding Article Nodes to Learning Map Flow

## Overview

Currently, the learning map visualization shows a root article node with related question nodes. When users click on questions or tooltips, new articles are generated. The goal is to enhance the map visualization to display all generated articles and their relationships, creating a comprehensive knowledge graph that users can navigate.

## Current Implementation

- `PersonalLearningMapFlow` shows only the root article and its immediate questions
- `ConversationNode` represents articles in the flow
- `QuestionNode` represents questions in the flow
- New articles are created when users interact with questions, but they're not added to the visualization

## Implementation Goals

1. Expand the visualization to show all articles in the learning map
2. Create a parent-child relationship between question nodes and their generated article nodes
3. Implement a tree-like layout algorithm that properly positions nodes
4. Add visual indication for the currently selected/active article
5. Enable navigation by clicking on any node in the visualization

## Implementation Plan

### 1. Data Structure Changes

**Data Flow:** We need to fetch all articles and questions for a learning map to build the complete graph.

```typescript
// Updated data model for visualization
interface FlowNode {
  id: string;
  type: "conversationNode" | "questionNode";
  position: { x: number; y: number };
  data: any; // Article data or Question data
}

interface FlowEdge {
  id: string;
  source: string; // Article ID or Question ID
  target: string; // Article ID or Question ID
  type: "smoothstep";
}

interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
```

### 2. Article Generation Mechanism

**Current Issue:** The system doesn't have a way to create a new article in response to a question. We need to:

1. Create a relationship between questions and the articles they generate
2. Update the database schema to track this relationship
3. Create an API endpoint to handle article generation from questions

```typescript
// Update Question schema in prisma/schema.prisma
model Question {
  id                  String   @id @default(uuid())
  text                String
  articleId           String
  sourceArticle       Article  @relation("QuestionSourceArticle", fields: [articleId], references: [id], onDelete: Cascade)
  destinationArticleId String?
  destinationArticle   Article? @relation("QuestionAnswerArticle", fields: [destinationArticleId], references: [id])
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// Update Article schema in prisma/schema.prisma
model Article {
  id                 String     @id @default(uuid())
  content            String
  summary            String     @default("")
  takeaways          String[]   @default([])
  learningMapId      String
  tooltips           Json?
  isRoot             Boolean    @default(false)
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt
  sourceQuestions    Question[] @relation("QuestionSourceArticle")
  answerToQuestions  Question[] @relation("QuestionAnswerArticle")
  learningMap        LearningMap @relation(fields: [learningMapId], references: [id], onDelete: Cascade)
}
```

**New API Endpoint:**

```typescript
// New server function in prisma/articles.ts
export const createArticleFromQuestion = createServerFn({ method: "POST" })
  .validator((data: { questionId: string; learningMapId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Creating article from question", {
      questionId: data.questionId,
    });

    try {
      // 1. Get the question
      const question = await prisma.question.findUnique({
        where: { id: data.questionId },
        include: { sourceArticle: true },
      });

      if (!question) {
        throw new Error(`Question not found: ${data.questionId}`);
      }

      // 2. Create a new article
      const newArticle = await prisma.article.create({
        data: {
          content: "", // Empty content that will be filled by streaming
          learningMapId: data.learningMapId,
          isRoot: false,
        },
      });

      // 3. Update the question to link to this article
      await prisma.question.update({
        where: { id: data.questionId },
        data: { destinationArticleId: newArticle.id },
      });

      return serializeArticle(newArticle);
    } catch (error) {
      logger.error("Error creating article from question", { error });
      throw error;
    }
  });
```

**New Hook:**

```typescript
// In hooks/api/articles.ts
export function useCreateArticleFromQuestion() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedArticle,
    Error,
    {
      questionId: string;
      learningMapId: string;
    }
  >({
    mutationFn: async (data) => {
      return createArticleFromQuestion({ data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["articles", "byMap", variables.learningMapId],
      });
    },
  });
}
```

### 3. Content Generation for Question-Based Articles

Currently, the article content generation process via `useStreamArticleContent` is not question-aware. It generates content based only on the subject title. We need to modify this to:

1. Pass the question context to the content generation process
2. Generate content that specifically answers the question
3. Update the API endpoint to support question-based content generation

```typescript
// Update the streaming API endpoint to accept question context
// Modify /api/lesson-stream to accept question information

// Update the streamContentFromAPI function in hooks/use-stream-article-content.ts
const streamContentFromAPI = async (
  subjectTitle: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  questionContext?: {
    questionId: string;
    questionText: string;
    sourceArticleId: string;
  }
): Promise<string> => {
  let fullContent = "";

  try {
    const requestData = questionContext
      ? {
          subject: subjectTitle,
          question: questionContext.questionText,
          message: `This article should answer the question: "${questionContext.questionText}"`,
        }
      : {
          subject: subjectTitle,
          moduleTitle: `Introduction to ${subjectTitle}`,
          moduleDescription: `A comprehensive introduction to ${subjectTitle} covering the fundamental concepts and principles.`,
          message: `This is the first article in an exploratory learning space for the subject (${subjectTitle}). Think a minuature Wikipedia article.`,
        };

    // ... rest of the streaming implementation
  }
};

// Update the useArticleContent hook to handle question-based articles
export function useArticleContent(
  article: SerializedArticle | null | undefined,
  subject: SerializedSubject,
  questionContext?: {
    id: string;
    text: string;
    sourceArticleId: string;
  }
) {
  // ... existing implementation

  // Pass the question context to the streaming function when available
  const startStreaming = useCallback(async () => {
    if (!article?.id || isStreaming) return;

    logger.info("Starting content streaming", {
      articleId: article.id,
      isQuestionBased: !!questionContext
    });

    // ... existing implementation with added questionContext parameter
    const fullContent = await streamContentFromAPI(
      subjectTitle,
      (chunk) => {
        setContent((prev) => prev + chunk);
      },
      controller.signal,
      questionContext
    );

    // ... rest of implementation
  }, [article?.id, subjectTitle, isStreaming, questionContext, updateArticleMutation]);

  // ... rest of the hook implementation
}
```

**Connecting to Question Navigation Flow:**

To integrate this with the navigation system, we need to:

1. Retrieve question text when navigating to a question node
2. Pass this context to the `useArticleContent` hook

```typescript
// Updated LearningInterface.tsx with question context tracking
const [questionContext, setQuestionContext] = useState<{
  id: string;
  text: string;
  sourceArticleId: string;
} | null>(null);

// Modified handleNodeClick
const handleNodeClick = async (nodeId: string) => {
  // Check if we're clicking a question node and if it has an associated article
  const question = learningMap?.articles
    ?.flatMap((article) => article.questions)
    .find((q) => q.id === nodeId);

  if (question) {
    if (question.destinationArticleId) {
      // Question already has an article, navigate to it
      setActiveArticleId(question.destinationArticleId);
      setQuestionContext({
        id: question.id,
        text: question.text,
        sourceArticleId: question.articleId,
      });
    } else {
      // Generate new article for this question
      const article = await createArticleFromQuestion.mutateAsync({
        questionId: nodeId,
        learningMapId: learningMap.id,
      });
      setActiveArticleId(article.id);
      setQuestionContext({
        id: question.id,
        text: question.text,
        sourceArticleId: question.articleId,
      });
    }
  } else {
    // Direct navigation to existing article
    setActiveArticleId(nodeId);
    setQuestionContext(null); // Clear question context
  }
};

// Pass question context to useArticleContent
const {
  content: articleContent,
  isStreaming,
  streamComplete,
  hasExistingContent,
} = useArticleContent(activeArticle || rootArticle, subject, questionContext);
```

### 4. API/Hook Changes

Modify `useArticlesByPersonalLearningMap` to fetch all article relationships:

```typescript
// Enhanced hook to fetch all articles with their relationships
export function useArticlesWithRelationships(learningMapId: string | null) {
  return useQuery({
    queryKey: ["articles", "withRelationships", learningMapId || "null"],
    queryFn: async () => {
      if (!learningMapId) return null;
      return getArticlesWithRelationships({ data: { learningMapId } });
    },
    enabled: Boolean(learningMapId),
  });
}
```

### 5. Node Generation & Layout

Update `PersonalLearningMapFlow.tsx` to:

1. Fetch all articles and questions
2. Create a node hierarchy
3. Implement a layout algorithm for proper node positioning
4. Handle the active/selected node state

### 6. Component Updates

#### Update PersonalLearningMapFlow.tsx:

```typescript
// Key changes:
// 1. Accept activeArticleId as prop
// 2. Use useArticlesGraph for data
// 3. Implement recursive layout algorithm
// 4. Add visual indicators for active node

interface PersonalLearningMapFlowProps {
  learningMapId: string;
  activeArticleId?: string;
  onNodeClick?: (nodeId: string) => void;
}

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  learningMapId,
  activeArticleId,
  onNodeClick,
}) => {
  const { nodes, edges, isLoading } = useArticlesGraph(
    learningMapId,
    activeArticleId
  );

  // Rest of implementation
};
```

#### Update LearningInterface.tsx:

```typescript
// Add state for current article
const [activeArticleId, setActiveArticleId] = useState<string | undefined>(
  rootArticle?.id
);

// Create useArticle hook for fetching active article content
const {
  article: activeArticle,
  isLoading: isLoadingActiveArticle,
} = useArticle(activeArticleId);

// Use activeArticle instead of rootArticle for content display
const {
  content: articleContent,
  isStreaming,
  streamComplete,
  hasExistingContent,
} = useArticleContent(activeArticle || rootArticle, subject);

// Handle node click to navigate
const handleNodeClick = async (nodeId: string) => {
  // Check if we're clicking a question node
  const isQuestion = nodeId.startsWith('q_'); // Implement proper type check

  if (isQuestion) {
    // Generate article from question if needed
    const article = await createArticleFromQuestion.mutateAsync({
      questionId: nodeId,
      learningMapId: learningMap.id,
    });
    setActiveArticleId(article.id);
  } else {
    // Direct navigation to existing article
    setActiveArticleId(nodeId);
  }
}

// Pass to PersonalLearningMapFlow
<PersonalLearningMapFlow
  learningMapId={learningMap?.id}
  activeArticleId={activeArticleId}
  onNodeClick={handleNodeClick}
/>
```

### 7. Testing Plan

1. Unit Tests:

   - Test the layout algorithm with different graph structures
   - Test node generation from article and question data

2. Integration Tests:

   - Test navigation between articles by clicking on nodes
   - Test that the correct content loads when navigating

3. Manual Testing:
   - Verify visual layout with various map complexities
   - Test zoom/pan functionality for larger maps
   - Verify proper highlighting of the active node

### 8. Implementation Phases

1. **Phase 1: Database Schema Updates**

   - Update Question model to track destination articles
   - Add migrations and update Prisma client

2. **Phase 2: Article Generation from Questions**

   - Create API endpoints for generating articles from questions
   - Update the content generation process

3. **Phase 3: Data Structure & Hooks**

   - Implement relationship fetching
   - Create the article graph data structure

4. **Phase 4: Visualization Components**

   - Update the flow component to handle the complete graph
   - Implement the layout algorithm

5. **Phase 5: Navigation & UI**
   - Add state management for active article
   - Implement navigation between articles
   - Add visual styling and indicators
