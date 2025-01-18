import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalibrationPill,
  type CalibrationLevel,
} from "@/components/ui/calibration-pill";

const levels: { min: number; max: number; label: CalibrationLevel }[] = [
  { min: 0, max: 0, label: "No calibration" },
  { min: 1, max: 4, label: "Lightly Calibrated" },
  { min: 5, max: 8, label: "Well Calibrated" },
  { min: 9, max: 20, label: "Finely Calibrated" },
];

interface KnowledgeNodesStepProps {
  knowledgeNodes: string[];
  selectedKnowledgeNodes: Set<string>;
  onToggleNode: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function KnowledgeNodesStep({
  knowledgeNodes,
  selectedKnowledgeNodes,
  onToggleNode,
  onBack,
  onNext,
}: KnowledgeNodesStepProps) {
  const currentLevel = levels.find(
    (level) =>
      selectedKnowledgeNodes.size >= level.min &&
      selectedKnowledgeNodes.size <= level.max
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Minimalist Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-light text-center text-gray-900 dark:text-gray-100">
            Calibrate Your Learning Path
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Select concepts you're familiar with to help refine your learning
            roadmap.
          </p>
          <div className="flex items-center justify-center space-x-3 mt-4">
            <CalibrationPill level={currentLevel?.label || "No calibration"} />
          </div>
          <div className="text-sm text-gray-400 text-center mt-2">
            {selectedKnowledgeNodes.size} concepts selected
          </div>
        </motion.div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {knowledgeNodes.map((concept, index) => (
              <motion.div
                key={concept}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex-none"
              >
                <Button
                  variant="outline"
                  className={`h-auto min-h-[2.5rem] py-1.5 px-3 rounded-full transition-all duration-200 ease-in-out whitespace-normal text-center flex items-center justify-center ${
                    selectedKnowledgeNodes.has(concept)
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => onToggleNode(concept)}
                >
                  <span className="text-sm font-medium">{concept}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto flex justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={onNext}
            className={`${
              selectedKnowledgeNodes.size > 0
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {selectedKnowledgeNodes.size > 0
              ? "Continue with selection"
              : "Skip calibration"}{" "}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
