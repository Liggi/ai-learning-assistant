import { useQuery } from "@tanstack/react-query";
import { generate } from "./generators/knowledge-nodes";

export function useKnowledgeNodes(subject: string) {
  return useQuery({
    queryKey: ["knowledgeNodes", subject],
    queryFn: async () => {
      const response = await generate({ data: { subject } });
      return response;
    },
    enabled: !!subject,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });
}
