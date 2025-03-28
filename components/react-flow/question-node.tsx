import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

interface QuestionNodeData {
  id: string;
  text: string;
  isImplicit: boolean;
}

interface QuestionNodeProps {
  data: QuestionNodeData;
  selected?: boolean;
}

function QuestionNode({ data, selected = false }: QuestionNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        max-w-[200px] rounded-lg overflow-hidden flex flex-col border
        shadow-md backdrop-blur-sm 
        transition-all duration-300 ease-in-out 
        cursor-pointer
        relative
        ${
          selected
            ? "shadow-lg border-purple-500 ring-2 ring-purple-500/50 bg-slate-800/90"
            : isHovered
              ? "shadow-lg border-slate-600 bg-slate-800/90"
              : data.isImplicit
                ? "border-slate-800 bg-slate-900/70"
                : "border-slate-700 bg-slate-900/80"
        }
      `}
      style={{
        minWidth: "140px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0"
      />

      <div className="px-3 py-2">
        <div className="flex items-center gap-1 mb-1">
          <span
            className={`text-xs font-medium ${data.isImplicit ? "text-slate-500" : "text-purple-400"}`}
          >
            {data.isImplicit ? "Explored" : "Question"}
          </span>
        </div>
        <p className="text-xs text-slate-300 line-clamp-3">{data.text}</p>
      </div>

      <div
        className={`h-1 absolute bottom-0 left-0 transition-all duration-300 
          ${data.isImplicit ? "bg-slate-600" : "bg-purple-500"}`}
        style={{ width: "100%" }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0"
      />
    </div>
  );
}

export default QuestionNode;
