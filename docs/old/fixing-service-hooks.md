# Fixing Service Hooks: Migration to Server Functions

## Overview

Our application has a design pattern issue where some service hooks directly access Prisma functions instead of going through TanStack Start's `createServerFn`. This creates several problems:

1. Potential security issues with direct database access from client code
2. Inconsistency with our established architecture patterns
3. Missing standardized validation and error handling
4. Harder to maintain type safety across the client-server boundary

The goal is to migrate all direct Prisma calls to proper server functions while maintaining the current API interfaces as much as possible to minimize disruption.

## Current Architecture vs. Target Architecture

### Current (Problematic) Pattern

```
Client Component → React Query Hook → Direct Prisma Function
```

**Example from `hooks/api/conversations.ts`:**

```typescript
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId),
    queryFn: () => (conversationId ? getConversation(conversationId) : null),
    enabled: !!conversationId,
  });
}
```

**Example from `prisma/conversations.ts`:**

```typescript
export async function getConversation(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: true },
  });
  // ...
}
```

### Correct Pattern (as seen in subjects.ts)

```
Client Component → React Query Hook → Server Function → Prisma
```

**Example from `hooks/api/subjects.ts`:**

```typescript
export function useSubject(subjectId: string) {
  return useQuery<SerializedSubject | null>({
    queryKey: ["subjects", subjectId],
    queryFn: async () => {
      return getSubject({ data: { id: subjectId } });
    },
  });
}
```

**Example from `prisma/subjects.ts`:**

```typescript
export const getSubject = createServerFn({ method: "GET" })
  .validator((data: unknown) => getSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject | null> => {
    // Prisma operations
  });
```

## Implementation Plan

### Phase 1: Server Functions Creation

1. **Update `prisma/conversations.ts` to use `createServerFn`**

   For each existing function, create an equivalent server function using `createServerFn`:

   - `getConversation` → `getConversationServerFn`
   - `createConversation` → `createConversationServerFn`
   - `addMessage` → `addMessageServerFn`
   - `getMessages` → `getMessagesServerFn`
   - `saveLayout` → `saveLayoutServerFn`
   - `getLayout` → `getLayoutServerFn`

   Each server function should:

   - Define proper Zod validation schemas
   - Implement error handling with standardized logging
   - Return serialized data (same format as current functions)

2. **Keep the old functions temporarily**

   Maintain the old direct functions during the transition, but update them to call the new server functions internally. This enables a gradual migration.

### Phase 2: React Query Hook Updates

1. **Update `hooks/api/conversations.ts` to use the new server functions**

   Modify each React Query hook to call the new server functions with the correct parameter format:

   - `useConversation`
   - `useCreateConversation`
   - `useMessages`
   - `useAddMessage`
   - `useLayout`
   - `useSaveLayout`

### Phase 3: Testing & Cleanup

1. **Test all conversation functionality** to ensure it works with the new pattern
2. **Remove the legacy direct Prisma functions** once everything is working
3. **Document the updated patterns** for future development

## Detailed Implementation Examples

### Example 1: `getConversation` Function

#### Step 1: Create server function in `prisma/conversations.ts`

```typescript
const getConversationSchema = z.object({
  id: z.string(),
});

export const getConversation = createServerFn({ method: "GET" })
  .validator((data: unknown) => getConversationSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedConversation | null> => {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.id },
        include: { messages: true },
      });

      if (!conversation) {
        return null;
      }

      return serializeConversation(conversation);
    } catch (error) {
      logger.error("Failed to fetch conversation", {
        error: error instanceof Error ? error.message : "Unknown error",
        id: data.id,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function getConversationLegacy(conversationId: string) {
  return getConversation({ data: { id: conversationId } });
}
```

#### Step 2: Update React Query hook in `hooks/api/conversations.ts`

```typescript
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId
      ? conversationKeys.detail(conversationId)
      : ["conversations", "detail", "null"],
    queryFn: async () =>
      conversationId ? getConversation({ data: { id: conversationId } }) : null,
    enabled: !!conversationId,
  });
}
```

### Example 2: `addMessage` Function

#### Step 1: Create server function in `prisma/conversations.ts`

```typescript
const addMessageSchema = z.object({
  conversationId: z.string(),
  text: z.string(),
  isUser: z.boolean(),
  parentId: z.string().optional(),
  tooltips: z.record(z.string(), z.string()).optional(),
});

export const addMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => addMessageSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedMessage> => {
    try {
      const validatedTooltips = data.tooltips || null;

      const message = await prisma.message.create({
        data: {
          text: data.text,
          isUser: data.isUser,
          conversationId: data.conversationId,
          parentId: data.parentId,
          tooltips: toNullableJson(validatedTooltips),
        },
      });

      return serializeMessage(message);
    } catch (error) {
      logger.error("Failed to add message", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: data.conversationId,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function addMessageLegacy(
  conversationId: string,
  text: string,
  isUser: boolean,
  parentId?: string,
  tooltips?: Record<string, string>
) {
  return addMessage({
    data: {
      conversationId,
      text,
      isUser,
      parentId,
      tooltips,
    },
  });
}
```

#### Step 2: Update React Query hook in `hooks/api/conversations.ts`

```typescript
export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      text,
      isUser,
      parentId,
      tooltips,
    }: {
      conversationId: string;
      text: string;
      isUser: boolean;
      parentId?: string;
      tooltips?: Record<string, string>;
    }) =>
      addMessage({
        data: {
          conversationId,
          text,
          isUser,
          parentId,
          tooltips,
        },
      }),
    // onSuccess handler remains the same
  });
}
```

## Implementation Order Recommendation

For a smooth transition, implement changes in this order:

1. Create new server functions in `prisma/conversations.ts` first
2. Add temporary legacy wrapper functions for backward compatibility
3. Update `hooks/api/conversations.ts` to use the new functions, one by one
4. Test each hook after updating to ensure functionality is preserved
5. Remove the legacy wrapper functions once all hooks are migrated and tested

## Testing Strategy

- Create unit tests for each server function
- Test each React Query hook independently
- Perform end-to-end tests of the conversation features
- Verify that error handling works as expected

## Potential Challenges

- Serialization formats might differ slightly between the old and new implementations
- Server functions have different error handling which might require updates to client code
- The server function validator might be more strict than previous implementations

## Conclusion

By following this plan, we'll achieve:

1. Consistent use of server functions across the application
2. Improved type safety and validation
3. Better error handling and logging
4. Adherence to our established architecture patterns

This refactoring will improve maintainability while preserving the current API interfaces as much as possible to minimize disruption to the application.
