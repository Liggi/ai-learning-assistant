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
import type { ArticleMetadata } from "@/types/serialized";

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
  learningMapId: string | null
): UseQueryResult<Article[]> {
  return useQuery<Article[]>({
    queryKey: ["articles", "byMap", learningMapId || "null"],
    queryFn: async () => {
      if (!learningMapId) return [];
      return getArticlesByPersonalLearningMap({
        data: { learningMapId },
      });
    },
    enabled: Boolean(learningMapId),
  });
}

/**
 * Hook to fetch the root article for a personal learning map
 */
export function useRootArticle(
  learningMapId: string | null
): UseQueryResult<Article | null> {
  return useQuery<Article | null>({
    queryKey: ["articles", "root", learningMapId || "null"],
    queryFn: async () => {
      if (!learningMapId) return null;
      return getRootArticle({
        data: { learningMapId },
      });
    },
    enabled: Boolean(learningMapId),
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
      learningMapId: string;
      content: string;
      isRoot?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return createArticle({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Hook to update an article
 */
export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation<
    Article,
    Error,
    {
      id: string;
      content?: string;
      summary?: string;
      takeaways?: string[];
      tooltips?: Record<string, string>;
    }
  >({
    mutationFn: async (data) => {
      return updateArticle({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
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
    { id: string; learningMapId?: string }
  >({
    mutationFn: async ({ id }) => {
      return deleteArticle({ data: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
