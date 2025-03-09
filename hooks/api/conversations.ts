import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversation,
  getConversationLegacy,
  createConversation,
  createConversationLegacy,
  addMessage,
  addMessageLegacy,
  getMessages,
  getMessagesLegacy,
  saveLayout,
  saveLayoutLegacy,
  getLayout,
  getLayoutLegacy,
  SerializedConversation,
  SerializedMessage,
  SerializedLayout,
} from "@/prisma/conversations";

// Query keys
export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (conversationId: string) =>
    [...conversationKeys.detail(conversationId), "messages"] as const,
  layout: (conversationId: string) =>
    [...conversationKeys.detail(conversationId), "layout"] as const,
};

// Hooks
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

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subjectId,
      moduleId,
    }: {
      subjectId: string;
      moduleId: string;
    }) => createConversation({ data: { subjectId, moduleId } }),
    onSuccess: (conversation) => {
      queryClient.setQueryData(
        conversationKeys.detail(conversation.id),
        conversation
      );
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId
      ? conversationKeys.messages(conversationId)
      : ["conversations", "detail", "null", "messages"],
    queryFn: async () =>
      conversationId ? getMessages({ data: { conversationId } }) : [],
    enabled: !!conversationId,
  });
}

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
    onSuccess: (message, { conversationId }) => {
      // Update messages cache
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(conversationId),
      });

      // Update conversation cache
      const conversation = queryClient.getQueryData<SerializedConversation>(
        conversationKeys.detail(conversationId)
      );
      if (conversation) {
        queryClient.setQueryData(conversationKeys.detail(conversationId), {
          ...conversation,
          messages: [...(conversation.messages || []), message],
        });
      }
    },
  });
}

export function useLayout(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId
      ? conversationKeys.layout(conversationId)
      : ["conversations", "detail", "null", "layout"],
    queryFn: async () =>
      conversationId ? getLayout({ data: { conversationId } }) : null,
    enabled: !!conversationId,
  });
}

export function useSaveLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      nodes,
      edges,
      nodeHeights,
    }: {
      conversationId: string;
      nodes: any[];
      edges: any[];
      nodeHeights: Record<string, number>;
    }) =>
      saveLayout({
        data: {
          conversationId,
          nodes,
          edges,
          nodeHeights,
        },
      }),
    onSuccess: (layout, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.layout(conversationId),
      });
    },
  });
}
