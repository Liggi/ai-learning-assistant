import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  getAllSubjects,
  getSubjectWithCurriculumMap,
  createSubject,
  type SerializedSubject,
  getSubject,
  getSubjectCurriculumMapId,
} from "@/prisma/subjects";
import { saveCurriculumMap } from "@/prisma/curriculum-maps";
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

export function useSubjectWithCurriculumMap(subjectId: string) {
  return useQuery<SerializedSubject | null>({
    queryKey: ["subjects", subjectId, "curriculumMap"],
    queryFn: async () => {
      return getSubjectWithCurriculumMap({ data: { id: subjectId } });
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

export function useSaveCurriculumMap() {
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
      return saveCurriculumMap({ data: { subjectId, nodes, edges } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}

export function useSubjectCurriculumMapId(
  subjectId: string | null,
  enabled: boolean
) {
  return useQuery<{ curriculumMapId: string } | null>({
    queryKey: ["subjects", subjectId, "curriculumMapId"],
    queryFn: async () => {
      if (!subjectId) return null;
      return getSubjectCurriculumMapId({ data: { subjectId } });
    },
    enabled,
  });
}
