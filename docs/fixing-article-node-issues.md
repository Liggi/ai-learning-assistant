# Implementation Plan: Fixing Article Nodes in Learning Map Flow

## Current Issues

1. **Missing Connections**: Questions and articles aren't properly connected with edges
2. **Interaction Failures**: Clicking questions or tooltips doesn't create new articles
3. **Layout Problems**: Overlapping nodes and poor visualization
4. **Node Visibility**: Only root node visible in the graph
5. **Missing Implementation**: Core functionality for article creation from questions not implemented

## Implementation Plan

### 1. Fix Data Model and Server Functions

```typescript
// Create a server function to handle article creation from questions
// Add to prisma/articles.ts
export const createArticleFromQuestion = createServerFn({ method: "POST" })
  .validator((data: { questionId: string }) => data)
  .handler(async ({ data }) => {
    try {
      // 1. Get the question with its source article
      const question = await prisma.question.findUnique({
        where: { id: data.questionId },
        include: { sourceArticle: true },
      });

      if (!question) throw new Error(`Question not found: ${data.questionId}`);

      // 2. Create a new article linked to the same learning map
      const newArticle = await prisma.article.create({
        data: {
          content: "", // Will be filled by streaming
          learningMapId: question.sourceArticle.learningMapId,
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

### 2. Create React Query Hook for Article Creation

```typescript
// Add to hooks/api/articles.ts
export function useCreateArticleFromQuestion() {
  const queryClient = useQueryClient();

  return useMutation<SerializedArticle, Error, { questionId: string }>({
    mutationFn: async (data) => {
      return createArticleFromQuestion({ data });
    },
    onSuccess: (_, variables) => {
      // Invalidate learning map and article queries
      queryClient.invalidateQueries({
        queryKey: ["articles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["learningMaps"],
      });
    },
  });
}
```

### 3. Connect Node Clicks to Article Creation

```typescript
// Update in components/personal-learning-map-flow.tsx
const FlowVisualization: React.FC = () => {
  // Existing code...

  const createArticleMutation = useCreateArticleFromQuestion();

  // Handle node click
  const onNodeClick = useCallback(
    async (event: React.MouseEvent, node: Node) => {
      // First check if it's a question without a destination article
      const question = questions.find(
        q => q.id === node.id && !q.destinationArticleId
      );

      if (question) {
        // Create a new article from the question
        try {
          const newArticle = await createArticleMutation.mutateAsync({
            questionId: node.id
          });

          // Set as active article
          handleNodeClick(newArticle.id);
        } catch (error) {
          logger.error("Failed to create article from question", { error });
        }
      } else {
        // Regular node click handling
        handleNodeClick(node.id);
      }
    },
    [handleNodeClick, createArticleMutation, questions]
  );

  // Pass onNodeClick to ReactFlow
  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodeClick={onNodeClick}
      // other props...
    />
  );
};
```

### 4. Improve Layout for Article-Question Relationships

```typescript
// Update in utils/force-directed-layout.ts
export function computeForceLayout(
  articles: SerializedArticle[],
  questions: SerializedQuestion[],
  options: ForceLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  // Default options
  const config = {
    linkDistance: 300, // Increased from 200
    chargeStrength: -1000, // Stronger repulsion
    collisionPadding: 50, // More padding between nodes
    centerStrength: 0.1,
    iterations: 500, // More iterations for better layout
    initialPositions: {},
    ...options,
  };

  // Rest of implementation...

  // Add specialized positioning for questions around their articles
  return positionQuestionsAroundArticles(nodes, edges);
}

function positionQuestionsAroundArticles(
  nodes: Node[],
  edges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  // Group questions by source article
  const articleQuestions = new Map<string, Node[]>();

  // Find article-question relationships
  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (
      sourceNode?.type === "conversationNode" &&
      targetNode?.type === "questionNode"
    ) {
      if (!articleQuestions.has(sourceNode.id)) {
        articleQuestions.set(sourceNode.id, []);
      }
      articleQuestions.get(sourceNode.id)?.push(targetNode);
    }
  });

  // Position questions in a semi-circle around each article
  articleQuestions.forEach((questionNodes, articleId) => {
    const articleNode = nodes.find((n) => n.id === articleId);
    if (!articleNode) return;

    const count = questionNodes.length;
    const radius = 350; // Distance from article

    questionNodes.forEach((questionNode, index) => {
      // Position in a semi-circle (180 degrees)
      const angle = (Math.PI / (count + 1)) * (index + 1);
      const x = articleNode.position.x + radius * Math.cos(angle);
      const y = articleNode.position.y + radius * Math.sin(angle);

      questionNode.position = { x, y };
    });
  });

  return { nodes, edges };
}
```

### 5. Enhance Node Styles for Better Visibility

```typescript
// Update ConversationNode component with more distinctive styling
const ConversationNode: React.FC<NodeProps> = ({ data, selected }) => {
  const isActive = data.isActive;

  return (
    <div
      className={`bg-slate-800 p-4 rounded-lg shadow-lg border-2 transition-all ${
        isActive
          ? 'border-blue-500 ring-2 ring-blue-400'
          : selected
            ? 'border-slate-400'
            : 'border-slate-700'
      }`}
      style={{ width: 350 }}
    >
      {/* Node content */}
    </div>
  );
};

// Update QuestionNode with more distinct styling
const QuestionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      className={`bg-slate-900 p-3 rounded-lg shadow-lg border-2 ${
        selected ? 'border-amber-500' : 'border-slate-700'
      } hover:border-amber-400`}
      style={{ width: 200 }}
    >
      {/* Node content */}
    </div>
  );
};
```

### 6. Connect Tooltip Clicks to Article Creation

```typescript
// Update MarkdownDisplay component to handle tooltip clicks
const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({
  content,
  tooltips,
  tooltipsReady
}) => {
  const createArticleMutation = useCreateArticleFromQuestion();

  const handleTooltipClick = async (tooltipId: string) => {
    try {
      // Find if we have a question for this tooltip
      const question = tooltipQuestions.find(q => q.tooltipId === tooltipId);

      if (!question) {
        // Create a question first if needed
        // Implementation depends on your existing system
      } else {
        // Create article from the question
        await createArticleMutation.mutateAsync({
          questionId: question.id
        });
      }
    } catch (error) {
      console.error("Error handling tooltip click", error);
    }
  };

  // Pass handler to tooltip component
  return (
    // Markdown rendering with tooltips that call handleTooltipClick
  );
};
```

### 7. Fix Edge Rendering Issues

```typescript
// In personal-learning-map-flow.tsx
useEffect(() => {
  if (flowNeedsUpdate && articles.length > 0) {
    logger.info("Calculating flow layout", {
      articleCount: articles.length,
      questionCount: questions.length,
    });

    try {
      // Compute layout
      let { nodes, edges } = computeForceLayout(articles, questions, {
        activeArticleId: activeArticleId || undefined,
      });

      // Ensure all connections are included
      edges = ensureAllEdges(articles, questions, edges);

      // Update visualization
      updateFlowVisualization(nodes, edges);

      // Fit view to show all nodes
      setTimeout(() => {
        reactFlow.fitView({ padding: 0.2 });
      }, 100);
    } catch (error) {
      logger.error("Error calculating layout", { error });
    }
  }
}, [articles, questions, activeArticleId, flowNeedsUpdate]);

// Helper to ensure all edges are included
function ensureAllEdges(
  articles: SerializedArticle[],
  questions: SerializedQuestion[],
  existingEdges: Edge[]
): Edge[] {
  const edgeMap = new Map<string, Edge>();

  // Add existing edges to map
  existingEdges.forEach((edge) => {
    edgeMap.set(`${edge.source}-${edge.target}`, edge);
  });

  // Add article-to-question edges
  articles.forEach((article) => {
    article.questions.forEach((question) => {
      const edgeId = `${article.id}-${question.id}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: article.id,
          target: question.id,
          type: "smoothstep",
        });
      }
    });
  });

  // Add question-to-destination-article edges
  questions.forEach((question) => {
    if (question.destinationArticleId) {
      const edgeId = `${question.id}-${question.destinationArticleId}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: question.id,
          target: question.destinationArticleId,
          type: "smoothstep",
        });
      }
    }
  });

  return Array.from(edgeMap.values());
}
```

### 8. Debugging Recommendations

1. Add detailed logging at key points:

   - When questions are created
   - When articles are created from questions
   - When layout is calculated
   - When nodes/edges are updated

2. Inspect the data flow:

   - Verify articles and questions are loaded correctly
   - Confirm that edges are being created
   - Check that the layout algorithm is receiving data

3. Visual debugging:
   - Temporarily render node IDs directly in node components
   - Add console logs to trace the force-directed layout calculations
   - Add a debug panel showing number of nodes and edges

## Implementation Sequence

1. Implement the server function for article creation
2. Create React Query hook for the API
3. Update node click handlers to trigger article creation
4. Fix and test the layout algorithm
5. Enhance node styling and visibility
6. Fix edge creation and rendering
7. Add tooltip click handling
8. Test with a complete flow from root article → question → new article

This plan addresses the core issues while maintaining the existing architecture. The primary focus is on correctly implementing the article creation from questions and ensuring proper visualization of the relationships.
