import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createArticle,
  createArticleFromQuestion,
  deleteArticle,
  getArticle,
  getArticlesByPersonalLearningMap,
  getRootArticle,
  updateArticle,
} from "@/prisma/articles";
import type { Article } from "@/types/personal-learning-map";
import type { SerializedArticle } from "@/types/serialized";

/**
 * Hook to fetch an article by ID
 */
export function useArticle(id: string | null): UseQueryResult<SerializedArticle | null> {
  return useQuery<SerializedArticle | null>({
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
export function useRootArticle(learningMapId: string | null): UseQueryResult<Article | null> {
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
 * Hook to create a new article from a question
 */
export function useCreateArticleFromQuestion() {
  const queryClient = useQueryClient();

  return useMutation<
    Article,
    Error,
    {
      learningMapId: string;
      parentArticleId: string;
      questionText: string;
    }
  >({
    mutationFn: async (data) => {
      return createArticleFromQuestion({ data });
    },
    onSuccess: (newArticle) => {
      queryClient.invalidateQueries({ queryKey: ["articles", newArticle.id] });

      queryClient.invalidateQueries({
        queryKey: ["articles", "byMap", newArticle.learningMapId],
      });
      queryClient.invalidateQueries({
        queryKey: ["articles", "root", newArticle.learningMapId],
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });

      queryClient.invalidateQueries({ queryKey: ["learningMaps"] });

      queryClient.invalidateQueries({
        queryKey: ["routeData", "/learning/article/$articleId", { articleId: newArticle.id }],
      });
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
