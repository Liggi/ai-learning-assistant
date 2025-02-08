import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllSubjects,
  getSubjectWithRoadmap,
  createSubject,
} from "@/prisma/subjects";

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      return getAllSubjects();
    },
  });
}

export function useSubjectWithRoadmap(subjectId: string) {
  return useQuery({
    queryKey: ["subjects", subjectId, "roadmap"],
    queryFn: async () => {
      return getSubjectWithRoadmap({ data: { id: subjectId } });
    },
    enabled: Boolean(subjectId),
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      return createSubject({ data: { title } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
