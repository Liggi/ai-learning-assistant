# Hooking Up the Conversation Map Visuals

## Current State Assessment

We've created the necessary components for visualizing a conversation map:

1. **VisualizationService**: Manages the state and operations for the visualization
2. **ConversationOrchestrator**: Coordinates different services including visualization
3. **ConversationVisualizer**: UI component for displaying the conversation map
4. **Database Integration**: Schema and functions for persisting the visualization

However, the conversation map isn't displaying properly. Key issues to address:

1. The conversation nodes don't have proper summary and takeaways content
2. We need to integrate with the existing component architecture
3. We need to generate high-quality content for visualization using LLM

## Implementation Progress

We've made significant progress on implementing the LLM-based approach:

✅ **Phase 1: LLM Content Generation Components**

- ✅ Created prompt template in `prompts/conversation/node-content.ts`
- ✅ Implemented server function in `features/generators/node-content.ts`
- ✅ Set up proper error handling and fallbacks

✅ **Phase 2: VisualizationService Updates**

- ✅ Added node content state management
- ✅ Implemented content generation function
- ✅ Fixed integration with message node creation
- ✅ Fixed type-checking for content.takeaways property
- ✅ Updated calculateLayout to handle async node creation
- ✅ Added updateLayout method to VisualizationService

✅ **Phase 3: Updated ConversationOrchestrator**

- ✅ Updated handlers to use new async visualization methods
- ✅ Fixed type errors related to async node creation
- ✅ Simplified layout updates with the new updateLayout method

## Current Issues

The implementation still has a few issues that need to be resolved:

1. **UI Component Updates**:

   - The ConversationFlow component needs to be updated to work with the new node structure
   - The visualization needs to be integrated into the ChatLayout component

2. **Testing and Integration**:
   - Need to test with real conversations
   - Need to verify that LLM-generated summaries and takeaways appear correctly
   - Need to confirm that the tree layout persists properly

## Implementation Approach

### 1. LLM-Generated Node Content

The ConversationNode component expects each node to have structured content:

```typescript
interface ConversationNodeData {
  id: string;
  text: string;
  summary: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  onClick?: (data: ConversationNodeData) => void;
}
```

Instead of trying to extract this content programmatically, we're using the Anthropic Claude LLM to generate:

- A concise summary for each message (both user and AI)
- Key takeaways for AI responses

This approach ensures high-quality representation of conversation content in the visualization.

### 2. LLM-Based Content Generation Service

We've created a dedicated LLM-based service for generating conversation node content:

1. ✅ Created a specialized prompt to generate summaries and takeaways
2. ✅ Implemented server functions to handle the LLM calls
3. ⏳ Integrating caching to avoid duplicate generation
4. ✅ Provided fallbacks in case of API failures

### 3. Integration with Service Architecture

We're extending our existing architecture by:

1. ⏳ Adding the node content generation to the VisualizationService
2. 🔄 Ensuring the ConversationOrchestrator coordinates the content generation
3. 🔄 Integrating with the existing conversation flow and chat structure

## Implementation Plan

### Phase 1: LLM Content Generation Components ✅

1. ✅ Created a prompt template for generating node content:

```typescript
// prompts/conversation/node-content.ts
export const createPrompt = ({
  text,
  isUser,
  subject,
  moduleTitle,
}: {
  text: string;
  isUser: boolean;
  subject: string;
  moduleTitle: string;
}) => {
  if (isUser) {
    return `Given the following user message in a learning conversation about ${subject}, create a brief summary...`;
  } else {
    return `Given the following AI teaching response in a conversation about ${subject}, extract key points and create a concise summary...`;
  }
};
```

2. ✅ Created a server function for generating node content:

```typescript
// features/generators/node-content.ts
export const generate = createServerFn({ method: "POST" })
  .validator((data) => data)
  .handler(async ({ data }) => {
    const prompt = createPrompt(data);
    const response = await callAnthropic(prompt, nodeContentSchema);
    return response;
  });
```

### Phase 2: Fix VisualizationService Implementation 🔄

1. Fix type-checking for takeaways:

```typescript
// Fix the messageToNode function
const messageToNode = useCallback(
  async (
    message: SerializedMessage,
    position: { x: number; y: number }
  ): Promise<ConversationNode> => {
    // Get content for this node (either from cache or generate new)
    const content = await generateContent(message);

    return {
      id: message.id,
      type: "conversationNode",
      position,
      data: {
        id: message.id,
        text: message.text,
        summary: content.summary,
        content: message.isUser
          ? undefined
          : {
              summary: content.summary,
              takeaways: content.takeaways || [],
            },
        isUser: message.isUser,
      },
    };
  },
  [generateContent]
);
```

2. Rewrite the tree layout algorithm for async node creation:

```typescript
const calculateLayout = useCallback(
  async (
    messages: SerializedMessage[]
  ): Promise<{
    nodes: ConversationNode[];
    edges: ConversationEdge[];
  }> => {
    logger.info(`Calculating layout for ${messages.length} messages`);

    // Build tree nodes map, keyed by message id
    const nodeMap: { [key: string]: TreeNode } = {};
    const roots: TreeNode[] = [];

    messages.forEach((msg) => {
      const treeNode: TreeNode = { message: msg, children: [] };
      nodeMap[msg.id] = treeNode;

      // Determine the parent by checking the parentId
      if (msg.parentId && nodeMap[msg.parentId]) {
        nodeMap[msg.parentId].children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    });

    // Assign positions to nodes
    let currentLeaf = 0;

    const assignPositions = async (
      node: TreeNode,
      depth: number,
      accumulatedY: number
    ): Promise<number> => {
      const x =
        node.children.length === 0
          ? START_X + currentLeaf++ * HORIZONTAL_SPACING
          : (() => {
              const childrenXPositions = node.children.map((child) =>
                assignPositions(
                  child,
                  depth + 1,
                  accumulatedY +
                    (nodeHeights[node.message.id] || DEFAULT_NODE_HEIGHT) +
                    VERTICAL_SPACING
                )
              );
              return Promise.all(childrenXPositions).then(
                (positions) =>
                  (Math.min(...positions) + Math.max(...positions)) / 2
              );
            })();

      node.position = {
        x: await x,
        y: accumulatedY,
      };

      return node.position.x;
    };

    // Assign positions for all root nodes
    let currentY = START_Y;
    for (const root of roots) {
      await assignPositions(root, 0, currentY);
      currentY +=
        (nodeHeights[root.message.id] || DEFAULT_NODE_HEIGHT) +
        VERTICAL_SPACING;
    }

    // Flatten the tree into nodes and edges arrays
    const computedNodes: ConversationNode[] = [];
    const computedEdges: ConversationEdge[] = [];

    const flattenTree = async (node: TreeNode) => {
      const computedNode = await messageToNode(node.message, node.position!);
      computedNodes.push(computedNode);

      for (const child of node.children) {
        computedEdges.push(createEdge(node.message.id, child.message.id));
        await flattenTree(child);
      }
    };

    for (const root of roots) {
      await flattenTree(root);
    }

    return { nodes: computedNodes, edges: computedEdges };
  },
  [messageToNode, createEdge, nodeHeights]
);
```

3. Add a public method to update the layout and save it:

```typescript
const updateLayout = useCallback(
  async (messages: SerializedMessage[]): Promise<void> => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      const layout = await calculateLayout(messages);
      setNodes(layout.nodes);
      setEdges(layout.edges);

      // Save layout to database
      await saveLayout(conversationId, {
        id: "",
        conversationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: layout.nodes,
        edges: layout.edges,
        nodeHeights: nodeHeights,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  },
  [conversationId, calculateLayout, saveLayout, nodeHeights]
);
```

### Phase 3: Update ConversationOrchestrator 🔄

1. Update the orchestrator to use the new async methods:

```typescript
// In useConversationOrchestrator.ts

// Pass subject info to visualization service
const visualization = useVisualizationService(conversation.conversationId, {
  subject: subjectId,
  moduleTitle: moduleTitle,
});

// Update handleUserMessage to handle async node creation
const handleUserMessage = useCallback(
  async (message: string) => {
    // Add user message to conversation
    const userMessage = await conversation.addUserMessage(message);

    // Calculate layout with async node creation
    await visualization.updateLayout(conversation.messages);

    // Generate AI response
    const responseText = await lesson.generateResponse(message);

    // Process tooltips and add AI response
    await tooltips.processContent(responseText, tooltipContext);
    const aiMessage = await conversation.addAIResponse(
      responseText,
      userMessage.id,
      tooltips.tooltips
    );

    // Update visualization again with the AI response
    await visualization.updateLayout(conversation.messages);

    // Select the most recent message
    conversation.selectMessage(aiMessage.id);
    visualization.zoomToNode(aiMessage.id);
  },
  [
    /* dependencies */
  ]
);
```

### Phase 4: Update ConversationFlow Component 🔄

1. Modify the ConversationFlow component to properly use the new nodes:

```tsx
// Update ConversationFlow component to handle the new node structure
<ReactFlow
  nodes={nodes.map((node) => ({
    ...node,
    position: node.position,
    selected: node.id === selectedNodeId,
    className: `node-${node.data.isUser ? "question" : "answer"}`,
    data: {
      ...node.data,
      onClick: () => onNodeClick?.(node.data.text, node.id),
    },
  }))}
  edges={edges}
  nodeTypes={nodeTypes}
  defaultEdgeOptions={defaultEdgeOptions}
  fitView
  // Other props
/>
```

### Phase 5: Add Integration to ChatLayout 🔄

1. Update the ChatLayout component to include the visualization in the sidebar.

### Phase 6: Testing and Integration 🔄

1. Test the visualization with real conversations
2. Verify that LLM-generated summaries and takeaways appear correctly
3. Confirm that the tree layout persists properly
4. Validate the user experience when clicking on nodes

## Next Steps

1. ✅ **Day 1**: Fix linter errors and implement async tree layout

   - ✅ Fix type checking for takeaways property
   - ✅ Rewrite calculateLayout to handle async node creation
   - ✅ Add updateLayout method to VisualizationService

2. ✅ **Day 2**: Update ConversationOrchestrator

   - ✅ Pass subject information to visualization service
   - ✅ Update handlers to use new async methods
   - ✅ Test conversation flow with async visualization

3. **Day 3**: Update UI Components

   - Update ConversationFlow to work with the new nodes
   - Integrate visualization into ChatLayout
   - Test full conversation flow with UI

4. **Day 4**: Final Testing and Refinement
   - Test with real conversations
   - Verify LLM-generated content appears correctly
   - Optimize performance if needed
