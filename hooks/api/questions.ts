import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getQuestionByChildArticleId } from "@/prisma/articles";
import type { SerializedArticle } from "@/types/serialized";

export interface QuestionWithParent {
  question: {
    id: string;
    text: string;
    learningMapId: string;
    parentArticleId: string;
    childArticleId: string;
    createdAt: string;
    updatedAt: string;
  };
  parentArticle: SerializedArticle | null;
}

/**
 * Hook to fetch a question by the child article ID
 */
export function useQuestionByChildArticleId(
  childArticleId: string | null | undefined
): UseQueryResult<QuestionWithParent | null> {
  return useQuery<QuestionWithParent | null>({
    queryKey: ["questions", "byChildArticle", childArticleId || "null"],
    queryFn: async () => {
      if (!childArticleId) return null;
      return getQuestionByChildArticleId({ data: { childArticleId } });
    },
    enabled: Boolean(childArticleId),
  });
}
