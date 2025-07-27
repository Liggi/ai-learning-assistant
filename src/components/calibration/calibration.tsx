import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalibrationPill,
  type CalibrationLevel,
} from "@/components/ui/calibration-pill";
import { useKnowledgeNodes } from "@/features/queries";
import { SerializedSubject } from "@/types/serialized";
import { CalibrationLoading } from "./loading";
import { KnowledgeNode } from "./knowledge-node";

interface ExistingKnowledgeCalibrationProps {
  subject: SerializedSubject;
  onBack: () => void;
  onNext: (concepts: string[]) => void;
}

export default function Calibration({
  subject,
  onBack,
  onNext,
}: ExistingKnowledgeCalibrationProps) {
  const {
    data: knowledgeNodes,
    isLoading,
    error,
  } = useKnowledgeNodes(subject.title);

  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set());

  const toggleKnowledgeNode = (id: string) => {
    setSelectedKnowledgeNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return <CalibrationLoading />;
  }

  if (error) {
    return <ErrorState onBack={onBack} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0D11] text-white">
      <CalibrationHeader
        selectedKnowledgeNodes={selectedKnowledgeNodes}
        totalKnowledgeNodes={knowledgeNodes?.length || 0}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="columns-2 md:columns-3 gap-4">
            {knowledgeNodes?.map((node) => {
              return (
                <div key={node.name} className="break-inside-avoid mb-4">
                  <KnowledgeNode
                    id={node.name}
                    complexity={node.complexity}
                    isSelected={selectedKnowledgeNodes.has(node.name)}
                    onClick={toggleKnowledgeNode}
                  >
                    {node.name}
                  </KnowledgeNode>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CalibrationFooter
        onBack={onBack}
        onNext={() => onNext(Array.from(selectedKnowledgeNodes))}
        selectedKnowledgeNodes={selectedKnowledgeNodes}
      />
    </div>
  );
}

const CalibrationHeader = ({
  selectedKnowledgeNodes,
  totalKnowledgeNodes,
}: {
  selectedKnowledgeNodes: Set<string>;
  totalKnowledgeNodes: number;
}) => {
  const levels: { min: number; max: number; label: CalibrationLevel }[] = [
    { min: 0, max: 0, label: "No calibration" },
    { min: 1, max: 4, label: "Lightly Calibrated" },
    { min: 5, max: 8, label: "Well Calibrated" },
    { min: 9, max: 20, label: "Finely Calibrated" },
  ];

  return (
    <div className="p-6 border-b border-gray-800">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[900px] mx-auto text-center"
      >
        <h2 className="text-3xl font-semibold mb-2">Calibration</h2>
        <p className="text-gray-400 mb-6">
          Select concepts you're familiar with to help me calibrate to your
          current level.
        </p>
        <div className="flex flex-col items-center gap-3">
          <CalibrationPill
            level={
              levels.find(
                (level) =>
                  selectedKnowledgeNodes.size >= level.min &&
                  selectedKnowledgeNodes.size <= level.max
              )?.label || "No calibration"
            }
          />
          <div className="inline-block bg-[#1C1F26] rounded-full px-4 py-2 text-gray-400">
            {selectedKnowledgeNodes.size} of {totalKnowledgeNodes} concepts
            selected
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CalibrationFooter = ({
  onBack,
  onNext,
  selectedKnowledgeNodes,
}: {
  onBack: () => void;
  onNext: () => void;
  selectedKnowledgeNodes: Set<string>;
}) => {
  return (
    <div className="border-t border-gray-800 p-4 bg-[#0B0D11]">
      <div className="max-w-[900px] mx-auto flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          onClick={onNext}
          variant="outline"
          className="text-gray-400 hover:text-white"
        >
          {selectedKnowledgeNodes.size > 0
            ? "Continue with selection"
            : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const ErrorState = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#0B0D11] text-white">
      <div className="text-center text-red-400">
        <p>Error loading knowledge nodes. Please try again.</p>
        <Button
          onClick={onBack}
          variant="outline"
          className="mt-4 text-gray-400 hover:text-white"
        >
          Back
        </Button>
      </div>
    </div>
  );
};
