import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createUserQuestion,
  getUserQuestion,
  getUserQuestionsByPersonalLearningMap,
  getUserQuestionsBySourceArticle,
  getUserQuestionsByDestinationArticle,
  updateUserQuestion,
  deleteUserQuestion,
} from "@/prisma/user-questions";
import type { UserQuestion } from "@/types/personal-learning-map";

/**
 * Hook to fetch a user question by ID
 */
export function useUserQuestion(
  id: string | null
): UseQueryResult<UserQuestion | null> {
  return useQuery<UserQuestion | null>({
    queryKey: ["userQuestions", id || "null"],
    queryFn: async () => {
      if (!id) return null;
      return getUserQuestion({ data: { id } });
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch all user questions for a personal learning map
 */
export function useUserQuestionsByPersonalLearningMap(
  personalLearningMapId: string | null
): UseQueryResult<UserQuestion[]> {
  return useQuery<UserQuestion[]>({
    queryKey: ["userQuestions", "byMap", personalLearningMapId || "null"],
    queryFn: async () => {
      if (!personalLearningMapId) return [];
      return getUserQuestionsByPersonalLearningMap({
        data: { personalLearningMapId },
      });
    },
    enabled: Boolean(personalLearningMapId),
  });
}

/**
 * Hook to fetch user questions by source article ID
 */
export function useUserQuestionsBySourceArticle(
  sourceArticleId: string | null
): UseQueryResult<UserQuestion[]> {
  return useQuery<UserQuestion[]>({
    queryKey: ["userQuestions", "bySourceArticle", sourceArticleId || "null"],
    queryFn: async () => {
      if (!sourceArticleId) return [];
      return getUserQuestionsBySourceArticle({
        data: { sourceArticleId },
      });
    },
    enabled: Boolean(sourceArticleId),
  });
}

/**
 * Hook to fetch user questions by destination article ID
 */
export function useUserQuestionsByDestinationArticle(
  destinationArticleId: string | null
): UseQueryResult<UserQuestion[]> {
  return useQuery<UserQuestion[]>({
    queryKey: [
      "userQuestions",
      "byDestinationArticle",
      destinationArticleId || "null",
    ],
    queryFn: async () => {
      if (!destinationArticleId) return [];
      return getUserQuestionsByDestinationArticle({
        data: { destinationArticleId },
      });
    },
    enabled: Boolean(destinationArticleId),
  });
}

/**
 * Hook to create a new user question
 */
export function useCreateUserQuestion() {
  const queryClient = useQueryClient();

  return useMutation<
    UserQuestion,
    Error,
    {
      personalLearningMapId: string;
      sourceArticleId: string;
      destinationArticleId: string;
      text: string;
      isImplicit?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return createUserQuestion({ data });
    },
    onSuccess: (userQuestion) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["userQuestions"],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "userQuestions",
          "byMap",
          userQuestion.personalLearningMapId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "userQuestions",
          "bySourceArticle",
          userQuestion.sourceArticleId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "userQuestions",
          "byDestinationArticle",
          userQuestion.destinationArticleId,
        ],
      });
      // Also invalidate personal learning map queries as they may include user questions
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps", userQuestion.personalLearningMapId],
      });
    },
  });
}

/**
 * Hook to update a user question
 */
export function useUpdateUserQuestion() {
  const queryClient = useQueryClient();

  return useMutation<
    UserQuestion,
    Error,
    {
      id: string;
      text: string;
    }
  >({
    mutationFn: async (data) => {
      return updateUserQuestion({ data });
    },
    onSuccess: (userQuestion) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["userQuestions", userQuestion.id],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "userQuestions",
          "byMap",
          userQuestion.personalLearningMapId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "userQuestions",
          "bySourceArticle",
          userQuestion.sourceArticleId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "userQuestions",
          "byDestinationArticle",
          userQuestion.destinationArticleId,
        ],
      });
      // Also invalidate personal learning map queries as they may include user questions
      queryClient.invalidateQueries({
        queryKey: ["personalLearningMaps", userQuestion.personalLearningMapId],
      });
    },
  });
}

/**
 * Hook to delete a user question
 */
export function useDeleteUserQuestion() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; id: string },
    Error,
    {
      id: string;
      personalLearningMapId?: string;
      sourceArticleId?: string;
      destinationArticleId?: string;
    }
  >({
    mutationFn: async ({ id }) => {
      return deleteUserQuestion({ data: { id } });
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["userQuestions", result.id],
      });

      if (variables.personalLearningMapId) {
        queryClient.invalidateQueries({
          queryKey: ["userQuestions", "byMap", variables.personalLearningMapId],
        });
        // Also invalidate personal learning map queries
        queryClient.invalidateQueries({
          queryKey: ["personalLearningMaps", variables.personalLearningMapId],
        });
      }

      if (variables.sourceArticleId) {
        queryClient.invalidateQueries({
          queryKey: [
            "userQuestions",
            "bySourceArticle",
            variables.sourceArticleId,
          ],
        });
      }

      if (variables.destinationArticleId) {
        queryClient.invalidateQueries({
          queryKey: [
            "userQuestions",
            "byDestinationArticle",
            variables.destinationArticleId,
          ],
        });
      }
    },
  });
}
