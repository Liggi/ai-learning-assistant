import { useQuery } from "@tanstack/react-query";
import { generateKnowledgeNodes } from "./generator";

export function useKnowledgeNodes(subject: string) {
  return useQuery({
    queryKey: ["knowledgeNodes", subject],
    queryFn: async () => {
      const response = await generateKnowledgeNodes({ data: { subject } });
      return response;
    },
    enabled: !!subject,
  });
}
