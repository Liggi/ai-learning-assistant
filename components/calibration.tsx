import { useEffect, useState } from "react";
import { useKnowledgeNodes } from "@/features/roadmap/queries";
import Loading from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import CalibrationScreen from "./calibration-screen";
import type { Subject } from "@/lib/types";
import type { KnowledgeNode } from "@/features/roadmap/types";

interface CalibrationProps {
  subject: string;
  selectedKnowledgeNodes: Set<string>;
  onCalibrationChange: (nodes: Set<string>) => void;
  onBack: () => void;
  onNext: () => void;
  onKnowledgeNodesGenerated?: (nodes: string[]) => void;
}

export default function Calibration({
  subject,
  selectedKnowledgeNodes,
  onCalibrationChange,
  onBack,
  onNext,
  onKnowledgeNodesGenerated = () => {},
}: CalibrationProps) {
  const { data: knowledgeNodes, isLoading, error } = useKnowledgeNodes(subject);
  const [sortedNodes, setSortedNodes] = useState<KnowledgeNode[]>([]);

  // Sort nodes by title
  useEffect(() => {
    if (!knowledgeNodes) return;

    // Sort by title
    const newSorted = [...knowledgeNodes].sort((a, b) => {
      return a.title.localeCompare(b.title);
    });

    // Only update if the nodes have actually changed
    const hasNodesChanged =
      !sortedNodes.length ||
      newSorted.some(
        (node, i) => !sortedNodes[i] || node.title !== sortedNodes[i].title
      );

    if (hasNodesChanged) {
      setSortedNodes(newSorted);
    }
  }, [knowledgeNodes]);

  // Separate effect for onKnowledgeNodesGenerated callback
  useEffect(() => {
    if (sortedNodes.length && onKnowledgeNodesGenerated) {
      onKnowledgeNodesGenerated(sortedNodes.map((node) => node.title));
    }
  }, [sortedNodes, onKnowledgeNodesGenerated]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0B0D11] text-white">
        <div className="text-center text-red-400">
          <p>Error loading knowledge nodes. Please try again.</p>
          <Button
            onClick={onBack}
            variant="outline"
            className="mt-4 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D11] text-white">
      <CalibrationScreen
        subject={{
          title: subject,
          description: "",
          id: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
        onComplete={onNext}
      />
    </div>
  );
}
