import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CalibrationPill,
  type CalibrationLevel,
} from "@/components/ui/calibration-pill";
import { generateKnowledgeNodes } from "@/resources/roadmap/generator";
import { useLearningContext } from "@/lib/context/learning-context";
import { ConceptItem } from "@/lib/types/types";
const levels: { min: number; max: number; label: CalibrationLevel }[] = [
  { min: 0, max: 0, label: "No calibration" },
  { min: 1, max: 4, label: "Lightly Calibrated" },
  { min: 5, max: 8, label: "Well Calibrated" },
  { min: 9, max: 20, label: "Finely Calibrated" },
];

interface CalibrationProps {
  onBack: () => void;
  onNext: () => void;
}

async function retrieveKnowledgeNodes(subject: string) {
  const nodes = await generateKnowledgeNodes({
    data: {
      subject,
    },
  });

  const retrievedNodes = nodes.map((node) => ({
    text: node,
    selected: false,
  }));

  return retrievedNodes;
}

export default async function Calibration({
  onBack,
  onNext,
}: CalibrationProps) {
  const { subject, knowledgeNodes, setKnowledgeNodes } = useLearningContext();

  if (subject && knowledgeNodes.length === 0) {
    const nodes = await retrieveKnowledgeNodes(subject);
    setKnowledgeNodes(nodes);
  }

  const currentLevel = levels.find(
    (level) =>
      knowledgeNodes.length >= level.min && knowledgeNodes.length <= level.max
  );

  const handleToggleNode = (node: ConceptItem) => {
    setKnowledgeNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: n.text === node.text ? !n.selected : n.selected,
      }))
    );
  };

  return (
    <div className="flex flex-col h-screen w-full">
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
            {knowledgeNodes.length} concepts selected
          </div>
        </motion.div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {knowledgeNodes.map((concept, index) => (
              <motion.div
                key={concept.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex-none"
              >
                <Button
                  variant="outline"
                  className={`h-auto min-h-[2.5rem] py-1.5 px-3 rounded-full transition-all duration-200 ease-in-out whitespace-normal text-center flex items-center justify-center ${
                    concept.selected
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => handleToggleNode(concept)}
                >
                  <span className="text-sm font-medium">{concept.text}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

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
              knowledgeNodes.length > 0
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {knowledgeNodes.length > 0
              ? "Continue with selection"
              : "Skip calibration"}{" "}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
