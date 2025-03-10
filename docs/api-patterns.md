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
