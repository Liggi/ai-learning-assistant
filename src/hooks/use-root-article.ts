import { useState, useEffect } from "react";
import { useCreateArticle } from "@/hooks/api/articles";
import { SerializedLearningMap } from "@/types/serialized";

export function useRootArticle(
  learningMap: SerializedLearningMap | null | undefined
) {
  const [isCreating, setIsCreating] = useState(false);
  const createArticleMutation = useCreateArticle();

  // Find the root article if it exists
  const rootArticle =
    learningMap?.articles?.find((article) => article.isRoot) || null;

  // Create a root article if needed
  useEffect(() => {
    // Only run this once when the learning map is loaded and has no root article
    if (
      learningMap &&
      !rootArticle &&
      !isCreating &&
      !createArticleMutation.isPending
    ) {
      setIsCreating(true);

      createArticleMutation.mutate(
        {
          learningMapId: learningMap.id,
          isRoot: true,
          content: "",
        },
        {
          onSettled: () => {
            setIsCreating(false);
          },
        }
      );
    }
  }, [learningMap?.id, rootArticle]);

  return {
    article: rootArticle,
    isLoading: isCreating || createArticleMutation.isPending,
    error: createArticleMutation.error,
  };
}
