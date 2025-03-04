import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  CalibrationPill,
  type CalibrationLevel,
} from "@/components/ui/calibration-pill";
import { useKnowledgeNodes } from "@/features/queries";
import Loading from "@/components/ui/loading";
import { SerializedSubject } from "@/prisma/subjects";
import { generate } from "@/features/generators/roadmap";
import { Logger } from "@/lib/logger";
import { useSaveRoadmap } from "@/hooks/api/subjects";

const logger = new Logger({ context: "ExistingKnowledgeCalibration" });

const levels: { min: number; max: number; label: CalibrationLevel }[] = [
  { min: 0, max: 0, label: "No calibration" },
  { min: 1, max: 4, label: "Lightly Calibrated" },
  { min: 5, max: 8, label: "Well Calibrated" },
  { min: 9, max: 20, label: "Finely Calibrated" },
];

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

interface KnowledgeNode {
  name: string;
  depth_level: number;
}

interface ExistingKnowledgeCalibrationProps {
  subject: SerializedSubject;
  onBack: () => void;
  onNext: () => void;
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

export default function ExistingKnowledgeCalibration({
  subject,
  onBack,
  onNext,
}: ExistingKnowledgeCalibrationProps) {
  const {
    data: knowledgeNodes,
    isLoading,
    error,
  } = useKnowledgeNodes(subject.title);
  const [sortedNodes, setSortedNodes] = useState<KnowledgeNode[]>([]);

  const [conceptComplexities, setConceptComplexities] = useState<
    Map<string, ComplexityLevel>
  >(new Map());

  const createRoadmapMutation = useSaveRoadmap();

  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set());

  const [isCreatingRoadmap, setIsCreatingRoadmap] = useState(false);

  async function createRoadmap() {
    logger.info("Starting roadmap creation", {
      subject,
    });

    try {
      const roadmap = await generate({
        data: {
          subject: subject.title,
          priorKnowledge: Array.from(selectedKnowledgeNodes).join("\n"),
        },
      });
      logger.info("Roadmap generated successfully");

      await createRoadmapMutation.mutateAsync({
        subjectId: subject.id,
        nodes: roadmap.nodes,
        edges: roadmap.edges,
      });
    } catch (error) {
      logger.error("Error in createRoadmap", { error });
      setIsCreatingRoadmap(false);
    }
  }

  const toggleKnowledgeNode = (id: string) => {
    setSelectedKnowledgeNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        logger.debug("Knowledge node removed", { id });
      } else {
        newSet.add(id);
        logger.debug("Knowledge node added", { id });
      }
      return newSet;
    });
  };

  // Sort nodes by depth_level and calculate initial visibility
  useEffect(() => {
    if (!knowledgeNodes) return;

    // Check if nodes have actually changed to prevent unnecessary updates
    const newSorted = [...knowledgeNodes].sort((a, b) => {
      if (a.depth_level !== b.depth_level) {
        return a.depth_level - b.depth_level;
      }
      return a.name.localeCompare(b.name);
    });

    // Only update if the nodes have actually changed
    const hasNodesChanged =
      !sortedNodes.length ||
      newSorted.some(
        (node, i) =>
          !sortedNodes[i] ||
          node.name !== sortedNodes[i].name ||
          node.depth_level !== sortedNodes[i].depth_level
      );

    if (hasNodesChanged) {
      setSortedNodes(newSorted);

      // Create complexities map
      const complexities = new Map<string, ComplexityLevel>();
      newSorted.forEach((node) => {
        complexities.set(node.name, getComplexityFromDepth(node.depth_level));
      });
      setConceptComplexities(complexities);
    }
  }, [knowledgeNodes]);

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
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0D11] text-white">
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
            Select concepts you're familiar with to help refine your learning
            roadmap.
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
              {selectedKnowledgeNodes.size} of {knowledgeNodes?.length || 0}{" "}
              concepts selected
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="columns-2 md:columns-3 gap-4">
            {sortedNodes.map((node) => {
              return (
                <div key={node.name} className="break-inside-avoid mb-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ pointerEvents: "auto" }}
                  >
                    <button
                      onClick={() => toggleKnowledgeNode(node.name)}
                      className={`
                        block w-full text-left px-3 py-2 rounded-2xl transition-all duration-200
                        ${
                          selectedKnowledgeNodes.has(node.name)
                            ? complexityStyles[
                                conceptComplexities.get(node.name) || "basic"
                              ].selected
                            : complexityStyles[
                                conceptComplexities.get(node.name) || "basic"
                              ].container
                        }
                        border shadow-sm hover:shadow-lg
                        ${selectedKnowledgeNodes.has(node.name) ? "shadow-[0_0_20px_rgba(255,255,255,0.1)]" : ""}
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`
                            w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                            ${
                              selectedKnowledgeNodes.has(node.name)
                                ? "border-black bg-black"
                                : "border-gray-600"
                            }
                          `}
                        >
                          {selectedKnowledgeNodes.has(node.name) && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span
                          className={`text-sm leading-normal whitespace-normal ${
                            selectedKnowledgeNodes.has(node.name)
                              ? "text-black"
                              : "text-white"
                          }`}
                        >
                          {node.name}
                        </span>
                      </div>
                    </button>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 p-4 bg-[#0B0D11]">
        <div className="max-w-[900px] mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="text-gray-400 hover:text-white"
            disabled={isCreatingRoadmap}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={async () => {
              setIsCreatingRoadmap(true);
              await createRoadmap();
              onNext();
              setIsCreatingRoadmap(false);
            }}
            variant="outline"
            className="text-gray-400 hover:text-white"
            disabled={isCreatingRoadmap}
          >
            {isCreatingRoadmap ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                {selectedKnowledgeNodes.size > 0
                  ? "Continue with selection"
                  : "Continue"}{" "}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
