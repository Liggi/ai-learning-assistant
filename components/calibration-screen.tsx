import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalibrationPill,
  type CalibrationLevel,
} from "@/components/ui/calibration-pill";
import type { Subject } from "@/lib/types";
import { useState } from "react";
import CalibrationNodesSelector from "./calibration-nodes-selector";

const levels: { min: number; max: number; label: CalibrationLevel }[] = [
  { min: 0, max: 0, label: "No calibration" },
  { min: 1, max: 4, label: "Lightly Calibrated" },
  { min: 5, max: 8, label: "Well Calibrated" },
  { min: 9, max: 20, label: "Finely Calibrated" },
];

interface CalibrationScreenProps {
  subject: Subject;
  onComplete: () => void;
}

export default function CalibrationScreen({
  subject,
  onComplete,
}: CalibrationScreenProps) {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  return (
    <div className="flex flex-col h-screen bg-[#0B0D11] text-white">
      {/* Minimalist Header */}
      <div className="p-6 border-b border-gray-800">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[900px] mx-auto text-center"
        >
          <h2 className="text-3xl font-semibold mb-2">
            Calibrate Your Learning Path
          </h2>
          <p className="text-gray-400 mb-6">
            Select concepts you're familiar with in {subject.title} to help
            refine your learning roadmap.
          </p>
          <div className="flex flex-col items-center gap-3">
            <CalibrationPill
              level={
                levels.find(
                  (level) =>
                    selectedNodes.size >= level.min &&
                    selectedNodes.size <= level.max
                )?.label || "No calibration"
              }
            />
          </div>
        </motion.div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          <CalibrationNodesSelector
            subject={subject}
            selectedNodes={selectedNodes}
            onSelectedNodesChange={setSelectedNodes}
          />
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="border-t border-gray-800 p-4 bg-[#0B0D11]">
        <div className="max-w-[900px] mx-auto flex justify-between">
          <Button
            onClick={onComplete}
            variant="outline"
            className="text-gray-400 hover:text-white"
          >
            {selectedNodes.size > 0
              ? "Continue with selection"
              : "Skip calibration"}{" "}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
