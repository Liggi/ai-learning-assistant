"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRef, useLayoutEffect } from "react";

const levelColors = {
  "Lightly Calibrated": "from-blue-600 to-blue-700",
  "Well Calibrated": "from-green-600 to-green-700",
  "Finely Calibrated": "from-purple-600 to-purple-700",
};

const levelWidths = {
  "Lightly Calibrated": "w-[160px]",
  "Well Calibrated": "w-[160px]",
  "Finely Calibrated": "w-[170px]",
  "Not set": "w-[100px]",
};

interface CalibrateHeaderProps {
  currentLevel: { label: string } | null;
  selectedKnowledgeNodes: Set<string>;
  totalNodes: number;
}

export default function CalibrateHeader({
  currentLevel,
  selectedKnowledgeNodes,
  totalNodes,
}: CalibrateHeaderProps) {
  const pillContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (pillContainerRef.current) {
      const rect = pillContainerRef.current.getBoundingClientRect();
      console.log("Pill container updated:", {
        width: rect.width,
        label: currentLevel?.label,
      });
    }
  }, [currentLevel?.label]);

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800 border-gray-700">
      <CardHeader className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle className="text-3xl font-light text-center text-gray-100">
            Calibrate Your Learning Path
          </CardTitle>
        </motion.div>
        <CardDescription className="text-center text-gray-300">
          Select concepts you're familiar with to help refine your learning
          roadmap.
        </CardDescription>
        <div className="flex items-center justify-center space-x-3 mt-6">
          <span className="text-base font-semibold text-gray-200">
            Current calibration:
          </span>
          <div ref={pillContainerRef} className="relative">
            <motion.div
              className={cn(
                "relative inline-flex items-center text-white text-sm font-medium rounded-full shadow-lg border-opacity-20 border border-white",
                currentLevel
                  ? levelWidths[currentLevel.label as keyof typeof levelWidths]
                  : levelWidths["Not set"]
              )}
              transition={{
                width: {
                  duration: 0.3,
                  ease: "easeInOut",
                },
              }}
            >
              <motion.div
                className={cn(
                  "absolute inset-0 bg-gradient-to-r rounded-full",
                  currentLevel
                    ? levelColors[
                        currentLevel.label as keyof typeof levelColors
                      ]
                    : "from-gray-600 to-gray-700"
                )}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              />
              <div className="relative px-4 py-1 w-full text-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentLevel?.label || "not-set"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.15,
                    }}
                  >
                    {currentLevel?.label || "Not set"}
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="text-sm text-gray-400 text-center mt-4">
          {selectedKnowledgeNodes.size} concepts selected
        </div>
      </CardHeader>
    </Card>
  );
}
