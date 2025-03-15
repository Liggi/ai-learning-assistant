# Learning Context Refactoring Plan

## Current Implementation Issues

- Orchestration functions add unnecessary complexity
- Component-based initializers with multi-step orchestration
- Logic for map initialization spread across multiple components
- "Find or create" logic is on the client side instead of server side
- Multiple useEffect hooks and state transitions make the flow hard to follow

## Refactoring Goals

1. Keep state machine reducer for state transitions
2. Move orchestration logic into component hooks
3. Move "find or create" logic to server side
4. Simplify the flow and reduce layers of abstraction

## Implementation Plan

### 1. Server-Side Functions

Create a new server function for map initialization:

```typescript
// server/personal-learning-maps.ts
export const getOrCreatePersonalLearningMap = createServerFn(
  async ({ subjectId, moduleId }) => {
    // Get curriculum map ID
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { curriculumMapId: true },
    });

    if (!subject) throw new Error("Subject not found");

    // Find existing maps
    const existingMaps = await prisma.personalLearningMap.findMany({
      where: {
        curriculumMapId: subject.curriculumMapId,
        moduleId,
      },
    });

    // Return existing map or create new one
    if (existingMaps.length > 0) {
      return serializePersonalLearningMap(existingMaps[0]);
    } else {
      const newMap = await prisma.personalLearningMap.create({
        data: {
          curriculumMapId: subject.curriculumMapId,
          moduleId,
          userId: "current-user-id", // Get from auth context
        },
      });
      return serializePersonalLearningMap(newMap);
    }
  }
);
```

### 2. Updated LearningContext

```typescript
// hooks/context/learning-context.tsx
export const LearningContextProvider: React.FC<LearningContextProviderProps> = ({
  children,
  subjectId,
  moduleId
}) => {
  const [state, dispatch] = useReducer(learningReducer, initialState);

  // Initialize context with IDs
  useEffect(() => {
    if (state.status === "IDLE") {
      dispatch({
        type: "INITIALISE_LEARNING_CONTEXT",
        payload: { subjectId, moduleId },
      });
    }
  }, [subjectId, moduleId, state.status]);

  return (
    <LearningContext.Provider value={{ state, dispatch }}>
      {children}
    </LearningContext.Provider>
  );
};
```

### 3. Component-Level Hook

Create a hook in the ChatLayout component to handle initialization:

```typescript
// components/chat-layout-new.tsx
const useLearningMapInitialization = () => {
  const { state, dispatch } = useLearningContext();
  const { subjectId, moduleId, status } = state;

  // Create the query for map initialization
  const { data, isLoading, error } = useQuery({
    queryKey: ["personalLearningMap", subjectId, moduleId],
    queryFn: () => getOrCreatePersonalLearningMap({ subjectId, moduleId }),
    enabled:
      status === "INITIALISING_LEARNING_MAP" && !!subjectId && !!moduleId,
  });

  // Update state when map is loaded
  useEffect(() => {
    if (data && !isLoading && !error) {
      dispatch({
        type: "INITIALISE_LEARNING_MAP_FINISHED",
        payload: { personalLearningMapId: data.id },
      });
    }

    if (error) {
      dispatch({
        type: "SET_ERROR",
        payload: { message: "Failed to initialize learning map" },
      });
    }
  }, [data, isLoading, error, dispatch]);

  // Start initialization when context is ready
  useEffect(() => {
    if (status === "IDLE" && subjectId && moduleId) {
      dispatch({ type: "INITIALISE_LEARNING_MAP_STARTED" });
    }
  }, [status, subjectId, moduleId, dispatch]);

  return { isLoading: status === "INITIALISING_LEARNING_MAP", error };
};
```

### 4. Simplified Component Usage

```typescript
const ChatLayoutContent: React.FC<ChatLayoutProps> = ({ moduleDetails }) => {
  const { state } = useLearningContext();
  const { isLoading, error } = useLearningMapInitialization();

  // Rest of the component remains unchanged
  // ...
};
```

## Benefits of New Approach

1. **Simpler Mental Model**: Clear separation between server and client responsibilities
2. **Reduced Complexity**: Single hook replaces multiple components and orchestration functions
3. **Better Testability**: Server functions can be tested in isolation
4. **Improved Performance**: Reduced client-side processing and state transitions
5. **Maintainability**: Easier to follow the initialization flow
6. **Type Safety**: Full end-to-end type safety from server to client

## Implementation Timeline

1. Create server-side function
2. Update LearningContext to remove orchestration
3. Remove LearningMapInitializer and orchestration-effects.ts
4. Implement the new hook in ChatLayout
5. Test with various edge cases
