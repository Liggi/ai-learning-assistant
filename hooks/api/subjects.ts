import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getAllSubjects,
  getSubjectWithRoadmap,
  createSubject,
  type SerializedSubject,
  getSubject,
} from "@/prisma/subjects";
import { saveRoadmap } from "@/prisma/roadmap";
import type { Node, Edge } from "@xyflow/react";

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

export function useSubjectWithRoadmap(subjectId: string) {
  return useQuery<SerializedSubject | null>({
    queryKey: ["subjects", subjectId, "roadmap"],
    queryFn: async () => {
      return getSubjectWithRoadmap({ data: { id: subjectId } });
    },
    enabled: Boolean(subjectId),
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
    },
  });
}

export function useSaveRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subjectId,
      nodes,
      edges,
    }: {
      subjectId: string;
      nodes: Node[];
      edges: Edge[];
    }) => {
      return saveRoadmap({ data: { subjectId, nodes, edges } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
