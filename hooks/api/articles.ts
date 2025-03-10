import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createArticle,
  getArticle,
  getArticlesByPersonalLearningMap,
  updateArticle,
  deleteArticle,
  getRootArticle,
} from "@/prisma/articles";
import type { Article } from "@/types/personal-learning-map";

/**
 * Hook to fetch an article by ID
 */
export function useArticle(id: string | null): UseQueryResult<Article | null> {
  return useQuery<Article | null>({
    queryKey: ["articles", id || "null"],
    queryFn: async () => {
      if (!id) return null;
      return getArticle({ data: { id } });
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch all articles for a personal learning map
 */
export function useArticlesByPersonalLearningMap(
  personalLearningMapId: string | null
): UseQueryResult<Article[]> {
  return useQuery<Article[]>({
    queryKey: ["articles", "byMap", personalLearningMapId || "null"],
    queryFn: async () => {
      if (!personalLearningMapId) return [];
      return getArticlesByPersonalLearningMap({
        data: { personalLearningMapId },
      });
    },
    enabled: Boolean(personalLearningMapId),
  });
}

/**
 * Hook to fetch the root article for a personal learning map
 */
export function useRootArticle(
  personalLearningMapId: string | null
): UseQueryResult<Article | null> {
  return useQuery<Article | null>({
    queryKey: ["articles", "root", personalLearningMapId || "null"],
    queryFn: async () => {
      if (!personalLearningMapId) return null;
      return getRootArticle({
        data: { personalLearningMapId },
      });
    },
    enabled: Boolean(personalLearningMapId),
  });
}

/**
 * Hook to create a new article
 */
export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation<
    Article,
    Error,
    {
      personalLearningMapId: string;
      content: string;
      isRoot?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return createArticle({ data });
    },
    onSuccess: (article) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["articles", article.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["articles", "byMap", article.personalLearningMapId],
      });
      if (article.isRoot) {
        queryClient.invalidateQueries({
          queryKey: ["articles", "root", article.personalLearningMapId],
        });
      }
      // Also invalidate the personal learning map queries
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps", article.personalLearningMapId],
      });
    },
  });
}

/**
 * Hook to update an article's content
 */
export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation<
    Article,
    Error,
    {
      id: string;
      content: string;
    }
  >({
    mutationFn: async (data) => {
      return updateArticle({ data });
    },
    onSuccess: (article) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["articles", article.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["articles", "byMap", article.personalLearningMapId],
      });
      if (article.isRoot) {
        queryClient.invalidateQueries({
          queryKey: ["articles", "root", article.personalLearningMapId],
        });
      }
    },
  });
}

/**
 * Hook to delete an article
 */
export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; id: string },
    Error,
    { id: string; personalLearningMapId?: string }
  >({
    mutationFn: async ({ id }) => {
      return deleteArticle({ data: { id } });
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["articles", result.id],
      });
      if (variables.personalLearningMapId) {
        queryClient.invalidateQueries({
          queryKey: ["articles", "byMap", variables.personalLearningMapId],
        });
        queryClient.invalidateQueries({
          queryKey: ["articles", "root", variables.personalLearningMapId],
        });
        // Also invalidate the personal learning map queries
        queryClient.invalidateQueries({
          queryKey: ["personalLearningMaps", variables.personalLearningMapId],
        });
      }
    },
  });
}
