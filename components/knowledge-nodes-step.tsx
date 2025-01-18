import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalibrationPill,
  type CalibrationLevel,
} from "@/components/ui/calibration-pill";

const levels: { min: number; max: number; label: CalibrationLevel }[] = [
  { min: 0, max: 0, label: "Not set" },
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
    <div className="space-y-4">
      <Card className="w-full max-w-2xl mx-auto bg-gray-800 border-gray-700">
        <div className="flex flex-col items-center space-y-4 p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-light text-center text-gray-100">
              Calibrate Your Learning Path
            </h2>
          </motion.div>
          <p className="text-center text-gray-300">
            Select concepts you're familiar with to help refine your learning
            roadmap.
          </p>
          <div className="flex items-center justify-center space-x-3 mt-6">
            <span className="text-base font-semibold text-gray-200">
              Current calibration:
            </span>
            <CalibrationPill level={currentLevel?.label || "Not set"} />
          </div>
          <div className="text-sm text-gray-400 text-center mt-4">
            {selectedKnowledgeNodes.size} concepts selected
          </div>
        </div>
      </Card>
      <Card className="w-full max-w-3xl mx-auto bg-white dark:bg-gray-900 shadow-lg border-0">
        <CardContent className="p-6">
          <ScrollArea className="h-[50vh] pr-4">
            <div className="grid grid-cols-1 gap-3">
              {knowledgeNodes.map((concept, index) => (
                <motion.div
                  key={concept}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left h-auto py-3 px-4 rounded-lg transition-all duration-200 ease-in-out ${
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
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-1/3 text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={onNext}
            className={`w-1/3 ${
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
        </CardFooter>
      </Card>
    </div>
  );
}
