import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createSubject,
  getSubject,
  getAllSubjects,
  updateSubject,
} from "@/prisma/subjects";
import { SerializedSubject } from "@/types/serialized";

export function useSubjects() {
  return useQuery<SerializedSubject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      return getAllSubjects();
    },
  });
}

export function useSubject(
  subjectId: string
): UseQueryResult<SerializedSubject | null> {
  return useQuery<SerializedSubject | null>({
    queryKey: ["subjects", subjectId],
    queryFn: async () => {
      return getSubject({ data: { id: subjectId } });
    },
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation<SerializedSubject, Error, string>({
    mutationFn: async (title: string) => {
      return createSubject({ data: { title } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    }
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation<
    SerializedSubject,
    Error,
    { id: string; data: Partial<Omit<SerializedSubject, "id">> }
  >({
    mutationFn: async ({ id, data }) => {
      return updateSubject({ data: { id, ...data } });
    },
    onSuccess: (data) => {
      // Invalidate the specific subject query
      queryClient.invalidateQueries({ queryKey: ["subjects", data.id] });
      // Also invalidate the general subjects list
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
