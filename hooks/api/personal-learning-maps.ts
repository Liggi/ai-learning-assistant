import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createPersonalLearningMap,
  getPersonalLearningMap,
  getPersonalLearningMapsByModule,
  updatePersonalLearningMap,
  updateMapContext,
  deletePersonalLearningMap,
  type SerializedPersonalLearningMap,
} from "@/prisma/personal-learning-maps";

/**
 * Hook to fetch a personal learning map by ID
 */
export function usePersonalLearningMap(
  id: string | null
): UseQueryResult<SerializedPersonalLearningMap | null> {
  return useQuery<SerializedPersonalLearningMap | null>({
    queryKey: ["personalLearningMaps", id || "null"],
    queryFn: async () => {
      if (!id) return null;
      return getPersonalLearningMap({ data: { id } });
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch personal learning maps by curriculum map module
 */
export function usePersonalLearningMapsByModule(
  curriculumMapId: string | null,
  moduleId: string | null,
  enabled: boolean
): UseQueryResult<SerializedPersonalLearningMap[]> {
  return useQuery<SerializedPersonalLearningMap[]>({
    queryKey: [
      "personalLearningMaps",
      "module",
      curriculumMapId || "null",
      moduleId || "null",
    ],
    queryFn: async () => {
      if (!curriculumMapId || !moduleId) return [];
      return getPersonalLearningMapsByModule({
        data: { curriculumMapId, moduleId },
      });
    },
    enabled,
  });
}

/**
 * Hook to create a new personal learning map
 */
export function useCreatePersonalLearningMap() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedPersonalLearningMap,
    Error,
    {
      subjectId: string;
      moduleId: string;
    }
  >({
    mutationFn: async (data) => {
      return createPersonalLearningMap({ data });
    },
    onSuccess: (personalLearningMap) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps"],
      });
      if (personalLearningMap.mapContext) {
        queryClient.invalidateQueries({
          queryKey: [
            "personalLearningMaps",
            "module",
            personalLearningMap.mapContext.curriculumMapId,
            personalLearningMap.mapContext.moduleId,
          ],
        });
      }
    },
  });
}

/**
 * Hook to update a personal learning map
 */
export function useUpdatePersonalLearningMap() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedPersonalLearningMap,
    Error,
    {
      id: string;
      metadata?: Record<string, any>;
    }
  >({
    mutationFn: async (data) => {
      return updatePersonalLearningMap({ data });
    },
    onSuccess: (personalLearningMap) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps", personalLearningMap.id],
      });
    },
  });
}

/**
 * Hook to update a map context
 */
export function useUpdateMapContext() {
  const queryClient = useQueryClient();

  return useMutation<
    any, // Using 'any' for the return type as we don't have a specific type for the map context response
    Error,
    {
      personalLearningMapId: string;
      curriculumMapId: string;
      moduleId: string;
      subjectId: string;
    }
  >({
    mutationFn: async (data) => {
      return updateMapContext({ data });
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps", variables.personalLearningMapId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "personalLearningMaps",
          "module",
          variables.curriculumMapId,
          variables.moduleId,
        ],
      });
    },
  });
}

/**
 * Hook to delete a personal learning map
 */
export function useDeletePersonalLearningMap() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; id: string }, Error, { id: string }>({
    mutationFn: async (data) => {
      return deletePersonalLearningMap({ data });
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps"],
      });
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps", result.id],
      });
    },
  });
}
