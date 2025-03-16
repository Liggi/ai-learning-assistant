import { useQuery } from "@tanstack/react-query";
import { getOrCreateLearningMap } from "@/prisma/learning-maps";
import { SerializedLearningMap } from "@/types/serialized";

/**
 * Hook to find or create a learning map for a subject
 */
export function useGetOrCreateLearningMap(subjectId: string | null) {
  return useQuery<SerializedLearningMap | null>({
    queryKey: ["learningMaps", "findOrCreate", subjectId || "null"],
    queryFn: async () => {
      if (!subjectId) return null;
      return getOrCreateLearningMap({
        data: {
          subjectId,
        },
      });
    },
    enabled: Boolean(subjectId),
  });
}
