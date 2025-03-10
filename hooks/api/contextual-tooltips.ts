import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTooltip,
  createTooltipBatch,
  getTooltip,
  getArticleTooltips,
  updateTooltip,
  deleteTooltip,
  deleteArticleTooltips,
  SerializedContextualTooltip,
} from "@/prisma/contextual-tooltips";
import { TooltipBatch } from "@/types/contextual-tooltip";

/**
 * Hook to fetch a tooltip by ID
 */
export function useTooltip(id: string | null) {
  return useQuery<SerializedContextualTooltip | null>({
    queryKey: id ? (["tooltips", id] as const) : (["tooltips", null] as const),
    queryFn: async () => {
      if (!id) return null;
      return getTooltip({ data: { id } });
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch all tooltips for an article
 */
export function useArticleTooltips(articleId: string | null) {
  return useQuery<SerializedContextualTooltip[]>({
    queryKey: articleId
      ? (["tooltips", "article", articleId] as const)
      : (["tooltips", "article", null] as const),
    queryFn: async () => {
      if (!articleId) return [];
      return getArticleTooltips({ data: { articleId } });
    },
    enabled: !!articleId,
  });
}

/**
 * Hook to create a single tooltip
 */
export function useCreateTooltip() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedContextualTooltip,
    Error,
    { articleId: string; term: string; explanation: string }
  >({
    mutationFn: async (data) => {
      return createTooltip({ data });
    },
    onSuccess: (tooltip) => {
      queryClient.invalidateQueries({
        queryKey: ["tooltips", "article", tooltip.articleId] as const,
      });
    },
  });
}

/**
 * Hook to create a batch of tooltips for an article
 */
export function useCreateTooltipBatch() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedContextualTooltip[],
    Error,
    { articleId: string; tooltips: TooltipBatch }
  >({
    mutationFn: async (data) => {
      return createTooltipBatch({ data });
    },
    onSuccess: (tooltips) => {
      if (tooltips.length > 0) {
        queryClient.invalidateQueries({
          queryKey: ["tooltips", "article", tooltips[0].articleId] as const,
        });
      }
    },
  });
}

/**
 * Hook to update a tooltip
 */
export function useUpdateTooltip() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedContextualTooltip,
    Error,
    { id: string; term?: string; explanation?: string }
  >({
    mutationFn: async (data) => {
      return updateTooltip({ data });
    },
    onSuccess: (tooltip) => {
      queryClient.invalidateQueries({
        queryKey: ["tooltips", tooltip.id] as const,
      });
      queryClient.invalidateQueries({
        queryKey: ["tooltips", "article", tooltip.articleId] as const,
      });
    },
  });
}

/**
 * Hook to delete a tooltip
 */
export function useDeleteTooltip() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; id: string }, Error, { id: string }>({
    mutationFn: async (data) => {
      return deleteTooltip({ data });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tooltips", result.id] as const,
      });
      // We don't know the articleId here, so we can't invalidate the article tooltips query
      // The component using this hook should handle that if needed
    },
  });
}

/**
 * Hook to delete all tooltips for an article
 */
export function useDeleteArticleTooltips() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; count: number },
    Error,
    { articleId: string }
  >({
    mutationFn: async (data) => {
      return deleteArticleTooltips({ data });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tooltips", "article", variables.articleId] as const,
      });
    },
  });
}
