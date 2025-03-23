import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { createQuestion, getQuestionsByArticle } from "@/prisma/questions";

/**
 * Hook to fetch questions for an article
 */
export function useQuestions(articleId: string | null): UseQueryResult<any[]> {
  return useQuery<any[]>({
    queryKey: ["questions", articleId || "null"],
    queryFn: async () => {
      if (!articleId) return [];
      return getQuestionsByArticle({ data: { articleId } });
    },
    enabled: Boolean(articleId),
  });
}

/**
 * Hook to create a new question
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      articleId: string;
      text: string;
    }
  >({
    mutationFn: async (data) => {
      return createQuestion({ data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["questions", variables.articleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["articles", "root"],
      });
      queryClient.invalidateQueries({
        queryKey: ["articles", variables.articleId],
      });
    },
  });
}
