import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLayoutByPersonalLearningMapId,
  createLayout,
  updateLayout,
  upsertLayout,
  deleteLayout,
  SerializedLayout,
} from "@/prisma/layouts";

// Query keys for layouts
const layoutKeys = {
  all: ["layouts"] as const,
  byPersonalLearningMap: (personalLearningMapId: string) =>
    [
      ...layoutKeys.all,
      "byPersonalLearningMap",
      personalLearningMapId,
    ] as const,
};

/**
 * Hook to fetch a layout by personal learning map ID
 */
export function useLayoutByPersonalLearningMap(
  personalLearningMapId: string | null
) {
  return useQuery({
    queryKey: personalLearningMapId
      ? layoutKeys.byPersonalLearningMap(personalLearningMapId)
      : ["layouts", "byPersonalLearningMap", "null"],
    queryFn: async () => {
      if (!personalLearningMapId) return null;
      return getLayoutByPersonalLearningMapId({
        data: { personalLearningMapId },
      });
    },
    enabled: !!personalLearningMapId,
  });
}

/**
 * Hook to create a new layout
 */
export function useCreateLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personalLearningMapId,
      nodes,
      edges,
      nodeHeights,
    }: {
      personalLearningMapId: string;
      nodes: any[];
      edges: any[];
      nodeHeights: Record<string, number>;
    }) =>
      createLayout({
        data: {
          personalLearningMapId,
          nodes,
          edges,
          nodeHeights,
        },
      }),
    onSuccess: (layout, { personalLearningMapId }) => {
      queryClient.invalidateQueries({
        queryKey: layoutKeys.byPersonalLearningMap(personalLearningMapId),
      });
    },
  });
}

/**
 * Hook to update an existing layout
 */
export function useUpdateLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personalLearningMapId,
      nodes,
      edges,
      nodeHeights,
    }: {
      personalLearningMapId: string;
      nodes: any[];
      edges: any[];
      nodeHeights: Record<string, number>;
    }) =>
      updateLayout({
        data: {
          personalLearningMapId,
          nodes,
          edges,
          nodeHeights,
        },
      }),
    onSuccess: (layout, { personalLearningMapId }) => {
      queryClient.invalidateQueries({
        queryKey: layoutKeys.byPersonalLearningMap(personalLearningMapId),
      });
    },
  });
}

/**
 * Hook to upsert a layout (create or update)
 */
export function useUpsertLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personalLearningMapId,
      nodes,
      edges,
      nodeHeights,
    }: {
      personalLearningMapId: string;
      nodes: any[];
      edges: any[];
      nodeHeights: Record<string, number>;
    }) =>
      upsertLayout({
        data: {
          personalLearningMapId,
          nodes,
          edges,
          nodeHeights,
        },
      }),
    onSuccess: (layout, { personalLearningMapId }) => {
      queryClient.invalidateQueries({
        queryKey: layoutKeys.byPersonalLearningMap(personalLearningMapId),
      });
    },
  });
}

/**
 * Hook to delete a layout
 */
export function useDeleteLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      personalLearningMapId,
    }: {
      personalLearningMapId: string;
    }) =>
      deleteLayout({
        data: { personalLearningMapId },
      }),
    onSuccess: (_, { personalLearningMapId }) => {
      queryClient.invalidateQueries({
        queryKey: layoutKeys.byPersonalLearningMap(personalLearningMapId),
      });
    },
  });
}
