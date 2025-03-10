# Migrating to a State Machine Orchestrator

This document outlines a step-by-step plan for migrating our current learning orchestrator to a state machine-based approach using React Context and reducers.

## 1. Define the State Machine

### 1.1. Identify Core States

First, we need to define the finite set of states that represent our system:

```javascript
export const LEARNING_STATES = {
  IDLE: "IDLE", // Initial state before anything happens
  INITIALIZING: "INITIALIZING", // Loading/creating personal learning map
  MAP_INITIALIZED: "MAP_INITIALIZED", // Map ready, but no content yet
  LOADING_ROOT_ARTICLE: "LOADING_ROOT_ARTICLE", // Getting existing root article
  CREATING_ROOT_ARTICLE: "CREATING_ROOT_ARTICLE", // Generating new root article
  STREAMING_CONTENT: "STREAMING_CONTENT", // Article content is streaming in
  PROCESSING_CONTENT: "PROCESSING_CONTENT", // Processing tooltips, questions, etc.
  READY: "READY", // Everything is loaded and ready
  ASKING_QUESTION: "ASKING_QUESTION", // Processing a user question
  GENERATING_RESPONSE: "GENERATING_RESPONSE", // Generating response to question
  ERROR: "ERROR", // Error state
};
```

### 1.2. Define the State Interface

```typescript
export interface LearningState {
  status: keyof typeof LEARNING_STATES;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };

  // Map data
  personalLearningMapId: string | null;

  // Content data
  currentArticleId: string | null;
  articleContent: string;
  isStreaming: boolean;
  streamProgress: number;

  // UI state
  tooltipsReady: boolean;
  questionsReady: boolean;

  // User interaction
  currentUserQuestion: string | null;

  // Visualization
  selectedNodeId: string | null;

  // Operation tracking
  operations: {
    tooltipGeneration: "IDLE" | "IN_PROGRESS" | "COMPLETE" | "ERROR";
    questionGeneration: "IDLE" | "IN_PROGRESS" | "COMPLETE" | "ERROR";
    articleCreation: "IDLE" | "IN_PROGRESS" | "COMPLETE" | "ERROR";
  };
}
```

## 2. Create the Reducer and Actions

### 2.1. Define Action Types

```typescript
export type LearningAction =
  | { type: "INITIALIZE_START" }
  | { type: "INITIALIZE_SUCCESS"; payload: { personalLearningMapId: string } }
  | { type: "INITIALIZE_ERROR"; payload: { error: Error } }
  | { type: "LOAD_ROOT_ARTICLE_START" }
  | {
      type: "LOAD_ROOT_ARTICLE_SUCCESS";
      payload: { articleId: string; content: string };
    }
  | { type: "CREATE_ROOT_ARTICLE_START" }
  | { type: "STREAM_CONTENT_CHUNK"; payload: { chunk: string } }
  | { type: "STREAM_CONTENT_COMPLETE" }
  | { type: "PROCESS_CONTENT_START" }
  | { type: "TOOLTIPS_READY" }
  | { type: "QUESTIONS_READY" }
  | { type: "CONTENT_READY" }
  | { type: "SELECT_NODE"; payload: { nodeId: string } }
  | { type: "ASK_QUESTION_START"; payload: { question: string } }
  | { type: "ASK_QUESTION_COMPLETE"; payload: { newArticleId: string } }
  | { type: "RESET" }
  | {
      type: "ERROR";
      payload: { message: string; code?: string; retryable?: boolean };
    };
```

### 2.2. Implement the Reducer

```typescript
const initialState: LearningState = {
  status: "IDLE",
  personalLearningMapId: null,
  currentArticleId: null,
  articleContent: "",
  isStreaming: false,
  streamProgress: 0,
  tooltipsReady: false,
  questionsReady: false,
  currentUserQuestion: null,
  selectedNodeId: null,
  operations: {
    tooltipGeneration: "IDLE",
    questionGeneration: "IDLE",
    articleCreation: "IDLE",
  },
};

function learningReducer(
  state: LearningState,
  action: LearningAction
): LearningState {
  switch (action.type) {
    case "INITIALIZE_START":
      return {
        ...state,
        status: "INITIALIZING",
        error: undefined,
      };

    case "INITIALIZE_SUCCESS":
      return {
        ...state,
        status: "MAP_INITIALIZED",
        personalLearningMapId: action.payload.personalLearningMapId,
      };

    case "INITIALIZE_ERROR":
      return {
        ...state,
        status: "ERROR",
        error: {
          message: action.payload.error.message,
          retryable: true,
        },
      };

    // Additional cases for other actions...

    case "LOAD_ROOT_ARTICLE_START":
      return {
        ...state,
        status: "LOADING_ROOT_ARTICLE",
      };

    case "LOAD_ROOT_ARTICLE_SUCCESS":
      return {
        ...state,
        status: "READY",
        currentArticleId: action.payload.articleId,
        articleContent: action.payload.content,
      };

    case "CREATE_ROOT_ARTICLE_START":
      return {
        ...state,
        status: "CREATING_ROOT_ARTICLE",
        operations: {
          ...state.operations,
          articleCreation: "IN_PROGRESS",
        },
      };

    case "STREAM_CONTENT_CHUNK":
      return {
        ...state,
        status: "STREAMING_CONTENT",
        isStreaming: true,
        articleContent: state.articleContent + action.payload.chunk,
        streamProgress: state.streamProgress + 1,
      };

    case "STREAM_CONTENT_COMPLETE":
      return {
        ...state,
        isStreaming: false,
        status: "PROCESSING_CONTENT",
      };

    // More cases...

    case "ERROR":
      return {
        ...state,
        status: "ERROR",
        error: {
          message: action.payload.message,
          code: action.payload.code,
          retryable: action.payload.retryable,
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
```

## 3. Create Context Provider

### 3.1. Create a Learning Context

```typescript
// hooks/context/learning-context.tsx
import React, { createContext, useReducer, useContext, useCallback } from 'react';
import { learningReducer, initialState, LearningState, LearningAction } from './learning-reducer';

interface LearningContextType {
  state: LearningState;
  dispatch: React.Dispatch<LearningAction>;

  // Convenience methods for common operations
  initialize: (subjectId: string, moduleId: string) => Promise<void>;
  askQuestion: (question: string) => Promise<void>;
  selectNode: (nodeId: string) => void;
  reset: () => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export const LearningProvider: React.FC<{
  children: React.ReactNode;
  services: {
    personalLearningMapService: any; // Replace with actual types
    articleService: any;
    tooltipService: any;
    userQuestionService: any;
    visualizationService: any;
  };
}> = ({ children, services }) => {
  const [state, dispatch] = useReducer(learningReducer, initialState);

  // Implementation of convenience methods
  const initialize = useCallback(async (subjectId: string, moduleId: string) => {
    try {
      dispatch({ type: 'INITIALIZE_START' });
      const mapId = await services.personalLearningMapService.initialize(subjectId, moduleId);
      dispatch({ type: 'INITIALIZE_SUCCESS', payload: { personalLearningMapId: mapId } });
    } catch (error) {
      dispatch({
        type: 'INITIALIZE_ERROR',
        payload: { error: error instanceof Error ? error : new Error(String(error)) }
      });
    }
  }, [services.personalLearningMapService]);

  // More implementations...

  const value = {
    state,
    dispatch,
    initialize,
    askQuestion: async () => {}, // Implement these methods
    selectNode: () => {},
    reset: () => dispatch({ type: 'RESET' })
  };

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
};

export const useLearning = () => {
  const context = useContext(LearningContext);
  if (context === undefined) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
};
```

## 4. Create the Orchestration Layer

### 4.1. Implement the Orchestration Effects

```typescript
// hooks/orchestration/learning-effects.tsx
import { useEffect } from "react";
import { useLearning } from "../context/learning-context";
import { Logger } from "@/lib/logger";

const logger = new Logger({
  context: "LearningEffects",
  enabled: true,
});

export function useLearningEffects({
  subjectId,
  moduleId,
  moduleTitle,
  moduleDescription,
  services,
}: {
  subjectId: string;
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
  services: any; // Replace with actual types
}) {
  const { state, dispatch } = useLearning();

  // Effect to handle initialization
  useEffect(() => {
    if (state.status === "IDLE" && subjectId && moduleId) {
      logger.info("Starting initialization", { subjectId, moduleId });
      const initializeMap = async () => {
        try {
          dispatch({ type: "INITIALIZE_START" });
          const mapId = await services.personalLearningMapService.initialize(
            subjectId,
            moduleId
          );
          dispatch({
            type: "INITIALIZE_SUCCESS",
            payload: { personalLearningMapId: mapId },
          });
        } catch (error) {
          logger.error("Initialization failed", { error });
          dispatch({
            type: "ERROR",
            payload: {
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
            },
          });
        }
      };

      initializeMap();
    }
  }, [state.status, subjectId, moduleId]);

  // Effect to handle loading/creating root article
  useEffect(() => {
    if (state.status === "MAP_INITIALIZED" && state.personalLearningMapId) {
      logger.info("Map initialized, checking for root article");

      const loadRootArticle = async () => {
        try {
          dispatch({ type: "LOAD_ROOT_ARTICLE_START" });

          // Check if root article exists
          const rootArticle =
            await services.personalLearningMapService.getRootArticle(
              state.personalLearningMapId
            );

          if (rootArticle) {
            logger.info("Root article found, loading content", {
              articleId: rootArticle.id,
            });
            dispatch({
              type: "LOAD_ROOT_ARTICLE_SUCCESS",
              payload: {
                articleId: rootArticle.id,
                content: rootArticle.content,
              },
            });
          } else {
            logger.info("No root article found, creating new one");
            dispatch({ type: "CREATE_ROOT_ARTICLE_START" });

            // Generate article content
            const articleDetails = {
              subject: subjectId,
              moduleTitle,
              moduleDescription,
              message: `Explain ${moduleTitle} to a beginner developer`,
            };

            // Start streaming content
            const contentGenerator =
              services.articleService.streamArticleContent(articleDetails);

            // Process content chunks
            for await (const chunk of contentGenerator) {
              dispatch({ type: "STREAM_CONTENT_CHUNK", payload: { chunk } });
            }

            dispatch({ type: "STREAM_CONTENT_COMPLETE" });

            // Create article in database
            const newArticle = await services.articleService.createArticle(
              state.personalLearningMapId,
              state.articleContent,
              true // isRoot
            );

            dispatch({
              type: "LOAD_ROOT_ARTICLE_SUCCESS",
              payload: {
                articleId: newArticle.id,
                content: newArticle.content,
              },
            });
          }
        } catch (error) {
          logger.error("Failed to load/create root article", { error });
          dispatch({
            type: "ERROR",
            payload: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      };

      loadRootArticle();
    }
  }, [state.status, state.personalLearningMapId]);

  // Additional effects for processing content, handling questions, etc.

  // Effect for processing article content (tooltips, questions)
  useEffect(() => {
    if (
      state.status === "PROCESSING_CONTENT" &&
      state.currentArticleId &&
      state.articleContent
    ) {
      logger.info("Processing article content", {
        articleId: state.currentArticleId,
      });

      const processContent = async () => {
        try {
          dispatch({ type: "PROCESS_CONTENT_START" });

          // Start processing tooltips
          services.tooltipService
            .processArticleContent(
              state.currentArticleId,
              state.articleContent,
              { subject: subjectId, moduleTitle }
            )
            .then(() => {
              dispatch({ type: "TOOLTIPS_READY" });
            })
            .catch((error) => {
              logger.error("Tooltip generation failed", { error });
              // Continue anyway, just log the error
            });

          // Start generating questions
          services.userQuestionService
            .generateSuggestedQuestions(state.articleContent, {
              subject: subjectId,
              moduleTitle,
              moduleDescription,
            })
            .then(() => {
              dispatch({ type: "QUESTIONS_READY" });
            })
            .catch((error) => {
              logger.error("Question generation failed", { error });
              // Continue anyway, just log the error
            });

          // Update visualization
          await services.visualizationService.updateLayout(
            [{ id: state.currentArticleId, content: state.articleContent }],
            []
          );

          dispatch({ type: "CONTENT_READY" });
        } catch (error) {
          logger.error("Failed to process content", { error });
          // Don't go to error state, just log the error
        }
      };

      processContent();
    }
  }, [state.status, state.currentArticleId, state.articleContent]);

  // Return state for external consumption
  return { state };
}
```

## 5. Refactor the ChatLayout Component

### 5.1. Update ChatLayout to Use Context

```typescript
// components/chat-layout.tsx
import React, { useEffect } from 'react';
import { LayoutGrid, RefreshCw } from 'lucide-react';
import MarkdownDisplay from './markdown-display';
import { ErrorDisplay } from './error-display';
import { SuggestedQuestions } from './suggested-questions';
import { LoadingIndicatorsContainer } from './ui/loading-indicators-container';
import { LearningProvider, useLearning } from '@/hooks/context/learning-context';
import { useLearningEffects } from '@/hooks/orchestration/learning-effects';
import PersonalLearningMapFlow from './personal-learning-map-flow';
import { Logger } from '@/lib/logger';

const logger = new Logger({
  context: 'ChatLayout',
  enabled: true
});

interface ChatLayoutProps {
  moduleDetails: {
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
    message: string;
  };
  subjectId: string;
  moduleId: string;
}

const ChatLayoutContent: React.FC<ChatLayoutProps> = ({
  moduleDetails,
  subjectId,
  moduleId,
}) => {
  const { state, askQuestion, selectNode, reset } = useLearning();

  // Use the orchestration effects
  useLearningEffects({
    subjectId,
    moduleId,
    moduleTitle: moduleDetails.moduleTitle,
    moduleDescription: moduleDetails.moduleDescription,
    // Pass services
  });

  // Log component mounting
  useEffect(() => {
    logger.info('ChatLayout mounted', {
      subjectId,
      moduleId,
      moduleTitle: moduleDetails.moduleTitle,
    });

    return () => {
      logger.info('ChatLayout unmounted');
    };
  }, [subjectId, moduleId, moduleDetails.moduleTitle]);

  // Handle user interactions
  const handleQuestionClick = (question: string) => {
    askQuestion(question);
  };

  const handleLearnMore = (concept: string) => {
    askQuestion(`Tell me more about ${concept}`);
  };

  const handleRefresh = () => {
    reset();
  };

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId);
  };

  if (state.status === 'ERROR' && state.error) {
    return (
      <ErrorDisplay
        title="Error Loading Lesson"
        message={state.error.message || "There was a problem loading the lesson content."}
      />
    );
  }

  // Determine what to show based on state
  const isLoading = ['INITIALIZING', 'LOADING_ROOT_ARTICLE', 'CREATING_ROOT_ARTICLE'].includes(state.status);
  const isStreaming = state.status === 'STREAMING_CONTENT';
  const showContent = state.articleContent !== '';

  // Get relevant data from state
  // (services will need to be adjusted to read from state instead of their internal state)
  const { articleContent, tooltipsReady, questionsReady } = state;

  // ... the rest of the component remains largely the same,
  // but using state from context instead of from the orchestrator

  return (
    // ... render UI based on state
    <div>Implement UI based on state machine state</div>
  );
};

const ChatLayout: React.FC<ChatLayoutProps> = (props) => {
  // Wrap the content in the provider
  return (
    <LearningProvider
      services={{
        // Initialize and pass services
      }}
    >
      <ChatLayoutContent {...props} />
    </LearningProvider>
  );
};

export default React.memo(ChatLayout);
```

## 6. Adapt Service Hooks

### 6.1. Refactor Services to Work with the State Machine

Each service should be updated to:

1. Read state from the context instead of managing its own state
2. Use dispatch to update state instead of internal setState
3. Focus on implementing the business logic without managing state transitions

For example, the ArticleService would change from:

```typescript
// Before
function useArticleService() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateArticleContent = async (details) => {
    setIsLoading(true);
    // ... generate content
    setContent(result);
    setIsLoading(false);
  };

  return { content, isLoading, generateArticleContent };
}
```

To:

```typescript
// After
function createArticleService({ dispatch }) {
  const generateArticleContent = async (details) => {
    dispatch({ type: "CREATE_ROOT_ARTICLE_START" });
    // ... generate content in chunks
    for (const chunk of chunks) {
      dispatch({ type: "STREAM_CONTENT_CHUNK", payload: { chunk } });
    }
    dispatch({ type: "STREAM_CONTENT_COMPLETE" });
  };

  return { generateArticleContent };
}
```

## 7. Implement Testing

### 7.1. Test the Reducer Logic

```typescript
// tests/learning-reducer.test.ts
import {
  learningReducer,
  initialState,
} from "../hooks/context/learning-reducer";

describe("Learning Reducer", () => {
  test("should return the initial state", () => {
    expect(learningReducer(undefined, { type: "ANY_ACTION" } as any)).toEqual(
      initialState
    );
  });

  test("should handle INITIALIZE_START", () => {
    const action = { type: "INITIALIZE_START" };
    const state = learningReducer(initialState, action);
    expect(state.status).toBe("INITIALIZING");
  });

  // More tests for each action type and transition
});
```

### 7.2. Test State Transitions

```typescript
// tests/state-transitions.test.ts
describe("State Transitions", () => {
  test("Full happy path sequence", () => {
    let state = initialState;

    // Step 1: Initialize
    state = learningReducer(state, { type: "INITIALIZE_START" });
    expect(state.status).toBe("INITIALIZING");

    state = learningReducer(state, {
      type: "INITIALIZE_SUCCESS",
      payload: { personalLearningMapId: "test-map-id" },
    });
    expect(state.status).toBe("MAP_INITIALIZED");
    expect(state.personalLearningMapId).toBe("test-map-id");

    // Step 2: Load article
    state = learningReducer(state, { type: "LOAD_ROOT_ARTICLE_START" });
    expect(state.status).toBe("LOADING_ROOT_ARTICLE");

    // More steps in the sequence...
  });

  // Test error paths
  test("Error during initialization", () => {
    let state = initialState;

    state = learningReducer(state, { type: "INITIALIZE_START" });
    state = learningReducer(state, {
      type: "INITIALIZE_ERROR",
      payload: { error: new Error("Connection failed") },
    });

    expect(state.status).toBe("ERROR");
    expect(state.error?.message).toBe("Connection failed");
    expect(state.error?.retryable).toBe(true);
  });
});
```

## 8. Migration Strategy

### 8.1. Step-by-Step Migration

1. **Create a Parallel Implementation**

   - Implement the state machine in new files without changing existing code
   - Test thoroughly before replacing existing code

2. **Create Adapters for Existing Services**

   - Wrap existing services to work with the new state machine
   - Gradually refactor services to use the new pattern

3. **Implement Feature Toggles**

   - Add a feature flag to switch between old and new implementations
   - Test both implementations side by side

4. **Migration Path**

   - First, create the reducer and context
   - Then, implement orchestration effects
   - Next, adapt individual services one by one
   - Finally, update the UI components

5. **Complete Transition**
   - Remove feature toggles when stable
   - Clean up legacy code
   - Update documentation and tests

## 9. Performance Considerations

### 9.1. Optimizing the State Machine

- Use selective state updates to prevent unnecessary re-renders
- Implement memoization for expensive computations
- Consider using React.memo for components that render frequently
- Use the React DevTools Profiler to identify and fix performance bottlenecks

### 9.2. Avoid State Machine Anti-Patterns

- Don't create too many states (state explosion)
- Avoid deep nesting of states
- Don't put transient data in state unless necessary
- Keep action payloads minimal and relevant

## 10. Documentation and Training

### 10.1. Update Documentation

- Create visual diagrams of the state machine
- Document each state and transition
- Provide examples of common flows

### 10.2. Developer Training

- Conduct a knowledge-sharing session on the new pattern
- Create example implementations for reference
- Set up pair programming sessions for transition period

## Conclusion

This migration to a state machine / reducer pattern will significantly improve the maintainability, predictability, and testability of our learning orchestration logic. By clearly defining states and transitions, we eliminate many of the current issues with our complex, entangled state management.

The structured approach ensures all possible states are accounted for, making edge cases and error conditions explicit rather than implicit. This will lead to a more robust application that is easier to debug, extend, and maintain over time.
