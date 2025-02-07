import { motion } from "framer-motion";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateKnowledgeNodes } from "@/features/roadmap/generator";
import type { Subject } from "@/lib/types";
import type { KnowledgeNode } from "@/features/roadmap/types";
import { Button } from "./ui/button";

const complexityStyles = {
  basic: {
    container: "bg-[#1C1F26] hover:bg-[#252932] border-gray-700/50",
    selected: "bg-white",
  },
  intermediate: {
    container:
      "bg-gradient-to-r from-[#1C1F26] to-[#1e2028] hover:from-[#252932] hover:to-[#2b2d36] border-blue-500/20",
    selected: "bg-gradient-to-r from-white to-blue-50",
  },
  advanced: {
    container:
      "bg-gradient-to-r from-[#1C1F26] via-[#1f1f2a] to-[#231f2c] hover:from-[#252932] hover:via-[#2a2a38] hover:to-[#2f2a3a] border-purple-500/30",
    selected: "bg-gradient-to-r from-white via-purple-50 to-white",
  },
  expert: {
    container:
      "bg-gradient-to-br from-[#1C1F26] via-[#231f2c] to-[#2c1c26] hover:from-[#252932] hover:via-[#2f2a3a] hover:to-[#3a2532] border-pink-500/40",
    selected: "bg-gradient-to-br from-white via-pink-50 to-white",
  },
  master: {
    container:
      "bg-gradient-to-br from-[#1C1F26] via-[#2c1c26] to-[#3c1c1c] hover:from-[#252932] hover:via-[#3a2532] hover:to-[#4a2525] border-red-500/50",
    selected: "bg-gradient-to-br from-white via-red-50 to-white",
  },
} as const;

type ComplexityLevel = keyof typeof complexityStyles;

interface CalibrationNodesSelectorProps {
  subject: Subject;
  selectedNodes: Set<string>;
  onSelectedNodesChange: (nodes: Set<string>) => void;
}

const getComplexityFromDepth = (depth: number): ComplexityLevel => {
  const mapping: Record<number, ComplexityLevel> = {
    1: "basic",
    2: "intermediate",
    3: "advanced",
    4: "expert",
    5: "master",
  };
  return mapping[depth] || "basic";
};

export default function CalibrationNodesSelector({
  subject,
  selectedNodes,
  onSelectedNodesChange,
}: CalibrationNodesSelectorProps) {
  const {
    data: knowledgeNodes,
    isLoading,
    error,
  } = useQuery<KnowledgeNode[]>({
    queryKey: ["knowledgeNodes", subject.id],
    queryFn: async () => {
      try {
        const response = await generateKnowledgeNodes({
          data: { subject: subject.title },
        });
        return response;
      } catch (err) {
        console.error("Error fetching knowledge nodes:", err);
        return [];
      }
    },
    enabled: !!subject?.id && !!subject?.title, // Only run query when we have the required data
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2, // Retry failed requests twice
  });

  if (error) {
    return <div>Error loading knowledge nodes. Please try again.</div>;
  }

  if (isLoading) {
    return <div>Loading knowledge nodes...</div>;
  }

  if (!knowledgeNodes?.length) {
    return <div>No knowledge nodes found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {knowledgeNodes.map((node) => (
        <Button
          key={node.id}
          variant={selectedNodes.has(node.id) ? "default" : "outline"}
          onClick={() => {
            const newNodes = new Set(selectedNodes);
            if (newNodes.has(node.id)) {
              newNodes.delete(node.id);
            } else {
              newNodes.add(node.id);
            }
            onSelectedNodesChange(newNodes);
          }}
          className="p-4 text-left h-auto"
        >
          <div>
            <div className="font-medium">{node.title}</div>
            <div className="text-sm text-gray-500">{node.description}</div>
          </div>
        </Button>
      ))}
    </div>
  );
}
