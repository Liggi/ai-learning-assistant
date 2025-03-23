import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { motion } from "framer-motion";

interface QuestionNodeData {
  id: string;
  text: string;
  isImplicit: boolean;
  isActive?: boolean;
}

interface QuestionNodeProps {
  data: QuestionNodeData;
  selected?: boolean;
}

function QuestionNode({ data, selected = false }: QuestionNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Animation variants for active/inactive state
  const variants = {
    active: {
      scale: 1.05,
      boxShadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    inactive: {
      scale: 1,
      boxShadow:
        "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
    hover: {
      scale: 1.02,
    },
  };

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial="inactive"
      animate={data.isActive ? "active" : selected ? "active" : "inactive"}
      whileHover="hover"
      variants={variants}
      style={{
        zIndex: data.isActive ? 10 : 0,
      }}
      className={`
        w-[200px] rounded-xl overflow-hidden flex flex-col border 
        shadow-lg backdrop-blur-sm 
        transition-all duration-300 ease-in-out 
        cursor-pointer
        group
        relative
        text-center
        ${
          data.isActive
            ? "shadow-xl border-blue-500/70 ring-2 ring-blue-500/30 bg-slate-800/90"
            : selected
              ? "shadow-xl border-slate-500 ring-2 ring-slate-500/50 bg-slate-800/90"
              : isHovered
                ? "shadow-xl border-amber-500/70 bg-slate-800/90"
                : "border-slate-700 bg-slate-900/90"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0"
      />

      <div className="p-4 bg-slate-800/50 backdrop-blur-sm group-hover:bg-slate-700/50 relative">
        {data.isActive && (
          <div className="absolute top-2 right-2">
            <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] font-semibold text-blue-300">
              Active
            </span>
          </div>
        )}
        <p className="text-sm text-slate-300 group-hover:text-slate-200 line-clamp-3 font-medium">
          {data.text}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0"
      />
    </motion.div>
  );
}

export default QuestionNode;
