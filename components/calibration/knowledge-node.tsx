import { motion } from "framer-motion";
import { type ReactNode } from "react";

export const complexityStyles = {
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

export type ComplexityLevel = keyof typeof complexityStyles;

interface KnowledgeNodeProps {
  id: string;
  complexity: ComplexityLevel;
  isSelected: boolean;
  onClick: (id: string) => void;
  children: ReactNode;
}

export function KnowledgeNode({
  id,
  complexity,
  isSelected,
  onClick,
  children,
}: KnowledgeNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ pointerEvents: "auto" }}
    >
      <button
        onClick={() => onClick(id)}
        className={`
          block w-full text-left px-3 py-2 rounded-2xl transition-all duration-200
          ${
            isSelected
              ? complexityStyles[complexity].selected
              : complexityStyles[complexity].container
          }
          border shadow-sm hover:shadow-lg
          ${isSelected ? "shadow-[0_0_20px_rgba(255,255,255,0.1)]" : ""}
        `}
      >
        <div className="flex items-start gap-2">
          <div
            className={`
              w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
              ${isSelected ? "border-black bg-black" : "border-gray-600"}
            `}
          >
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span
            className={`text-sm leading-normal whitespace-normal ${
              isSelected ? "text-black" : "text-white"
            }`}
          >
            {children}
          </span>
        </div>
      </button>
    </motion.div>
  );
}
