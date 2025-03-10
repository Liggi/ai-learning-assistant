# New Domain Model - Final Implementation Tasks

This document outlines the remaining tasks needed to complete our domain model migration from the conversation-based architecture to the new structured learning approach that distinguishes between curriculum design (CurriculumMap) and individual learning experiences (PersonalLearningMap).

## Current Implementation Status

We've successfully implemented most of the core components for our new domain model:

1. **Database Models**: All models have been created with proper relationships
2. **Type Definitions**: TypeScript interfaces and Zod schemas for all entities
3. **Server Functions**: Data access layer for all domain entities
4. **API Hooks**: React Query hooks for data fetching and mutation
5. **Service Layer**: Business logic encapsulation for all domain entities
6. **Orchestration Layer**: Learning orchestrator to coordinate services
7. **UI Components**: Initial implementation of learning layout and visualization
8. **Generator Integration**: Verified integration of article, tooltip, and question generators with the new domain model

## Remaining Implementation Tasks

### Phase 8: Integration and Functionality Verification

#### ✅ Step 1: Complete Generator Integration

The generators have been verified with our new domain model:

1. **Article Generator**:

   - ✅ Verified that the article generator correctly produces content for the new domain model
   - ✅ Ensured proper content streaming during article generation
   - ✅ Verified error handling for article generation failures

2. **Tooltip Generator**:

   - ✅ Verified that the tooltip extraction works correctly in the new domain model
   - ✅ Ensured tooltips are properly associated with articles
   - ✅ Verified tooltips are displayed correctly in the UI

3. **Question Generator**:
   - ✅ Verified that suggested questions are properly generated for articles
   - ✅ Ensured questions are properly associated with articles
   - ✅ Verified questions are displayed correctly in the UI

#### Step 2: UI Refinements

Several UI components need refinement to fully support the new domain model:

1. **PersonalLearningMapFlow**:

   - Enhance the visual distinction between articles and questions
   - Add support for node selection and highlighting
   - Implement proper edge styling for different question types
   - Add zoom and pan controls for better navigation

2. **Article Node**:

   - Optimize content display for different screen sizes
   - Add support for collapsible sections
   - Implement proper error state visualization

3. **Question Node**:
   - Add visual indicators for question type (explicit vs. implicit)
   - Implement proper handling of long question texts

#### Step 3: Performance Optimization

Several performance optimizations are needed:

1. **Query Optimization**:

   - Implement proper query deduplication for frequently accessed data
   - Add stale-while-revalidate patterns for smoother UI updates
   - Optimize query invalidation to minimize unnecessary refetches

2. **Content Generation**:

   - Implement proper request throttling for AI-generated content
   - Add batching for related operations (e.g., tooltip generation)
   - Implement cancellation logic for abandoned operations

3. **Visualization Rendering**:
   - Optimize layout algorithm for large maps
   - Implement virtualization for rendering only visible nodes
   - Add incremental updates for smoother animations

#### Step 4: Error Handling and Recovery

Enhance error handling and recovery mechanisms:

1. **Service Error Handling**:

   - Implement consistent error transformation across all services
   - Add retry logic with exponential backoff for transient failures
   - Implement proper error boundaries to isolate failures

2. **Orchestration Error Recovery**:

   - Add support for partial state recovery after failures
   - Implement session persistence for recovery after page reload
   - Add proper cleanup for abandoned operations

3. **UI Error States**:
   - Implement user-friendly error messages for all error types
   - Add recovery options for common error scenarios
   - Implement proper loading states for all async operations

#### Step 5: Testing and Validation

Comprehensive testing is needed to ensure reliability:

1. **Unit Tests**:

   - Add tests for all service methods and core business logic
   - Implement proper mocking for external dependencies
   - Add validation tests for all data transformations

2. **Integration Tests**:

   - Test interactions between services and orchestration layer
   - Verify proper data flow through the entire application
   - Test edge cases and error scenarios

3. **UI Testing**:
   - Implement visual regression tests for UI components
   - Add accessibility testing for all user interfaces
   - Test responsiveness across different screen sizes

### Phase 9: Cleanup and Documentation

#### Step 1: Code Cleanup

Remove deprecated code and ensure consistency:

1. **Remove Legacy Components**:

   - Remove ChatLayout and Conversation components
   - Delete unused roadmap references throughout the codebase
   - Clean up unused imports and dependencies

2. **Terminology Consistency**:

   - Update all remaining "roadmap" references to "curriculum map"
   - Ensure consistent naming in comments and documentation
   - Update prompt templates to use the new terminology

3. **Type Cleanup**:
   - Remove deprecated types and interfaces
   - Update inline documentation for all types
   - Ensure proper type exports and imports

#### Step 2: Documentation Updates

Finalize documentation for the new domain model:

1. **Architecture Documentation**:

   - Update architecture diagrams to reflect the new domain model
   - Document interaction patterns between services
   - Add detailed descriptions of data flow through the system

2. **API Documentation**:

   - Document all server functions and their parameters
   - Add usage examples for common operations
   - Document error handling patterns and expected responses

3. **Developer Guides**:
   - Create onboarding documentation for new developers
   - Add troubleshooting guides for common issues
   - Document best practices for extending the system

## Implementation Approach

For each of the remaining tasks, we should follow these principles:

1. **Incremental Implementation**: Complete one task at a time, verifying functionality before moving on
2. **Behavior Preservation**: Ensure that existing functionality works correctly during the transition
3. **Type Safety**: Maintain strong typing throughout the implementation
4. **Error Handling**: Implement robust error handling for all operations
5. **Documentation**: Update documentation as tasks are completed

## Generator Integration Verification Steps

To verify the integration of our generators with the new domain model, follow these steps:

### Article Generator Verification

1. **Functionality Check**:

   - Navigate to a module in the curriculum map
   - Verify that the article content is generated and displayed correctly
   - Check that the content is properly streamed to the UI with the typing indicator

2. **Error Handling**:

   - Test error scenarios by temporarily modifying the generator to throw errors
   - Verify that error states are displayed correctly in the UI
   - Ensure the application recovers gracefully from errors

3. **Integration with Domain Model**:
   - Verify that articles are properly saved to the database with the correct associations
   - Check that articles are properly linked to the personal learning map
   - Ensure the article content is properly displayed in the visualization

### Tooltip Generator Verification

1. **Functionality Check**:

   - Verify that tooltips are extracted from article content
   - Check that tooltips are displayed when hovering over bolded terms
   - Ensure tooltip content is contextually relevant

2. **Error Handling**:

   - Test error scenarios in tooltip generation
   - Verify that the application continues to function even if tooltip generation fails

3. **Integration with Domain Model**:
   - Verify that tooltips are properly saved as ContextualTooltip entities
   - Check that tooltips are associated with the correct article
   - Ensure tooltips are loaded when revisiting an article

### Question Generator Verification

1. **Functionality Check**:

   - Verify that suggested questions are generated for articles
   - Check that questions are displayed in the UI
   - Ensure clicking on a question generates a new article

2. **Error Handling**:

   - Test error scenarios in question generation
   - Verify that the application continues to function even if question generation fails

3. **Integration with Domain Model**:
   - Verify that questions are properly saved as UserQuestion entities
   - Check that questions link the correct source and destination articles
   - Ensure the question-article relationships are visualized correctly

## End-to-End Flow Testing

To ensure all components work together correctly, test the following end-to-end flows:

### Basic Learning Flow

1. Select a subject from the home page
2. Complete the knowledge calibration step
3. View the curriculum map
4. Select a module to learn about
5. Verify the article is generated and displayed
6. Verify tooltips appear when hovering over bolded terms
7. Verify suggested questions are displayed
8. Click on a suggested question
9. Verify a new article is generated in response
10. Verify the personal learning map visualization updates to show both articles and the question connection

### Term Exploration Flow

1. Navigate to an article with tooltips
2. Click "Learn more about this term" on a tooltip
3. Verify a new article is generated about the term
4. Verify the personal learning map visualization updates to show the new article and connection
5. Verify you can navigate back to the original article through the visualization

### Error Recovery Flow

1. Simulate an error in article generation (e.g., by temporarily disabling the API)
2. Verify appropriate error messages are displayed
3. Verify the application allows retrying or returning to a previous state
4. Restore normal operation and verify the application recovers correctly

## API Patterns

All implementations should follow our established API patterns:

### Server Function Pattern

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

## Conclusion

By completing these remaining tasks, we will fully transition from our previous conversation-based model to our new domain-focused architecture. This transition will provide a more structured and maintainable approach to building our learning assistant application, with clear separation between curriculum design and personal learning experiences.
