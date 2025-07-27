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
        max-w-[400px] rounded-xl overflow-hidden flex flex-col p-3 font-semibold
        shadow-md backdrop-blur-sm
        transition-all duration-200
        cursor-pointer
        ${
          selected
            ? "scale-[1.10] ring-3 ring-pink-400/40 shadow-[0_0_10px_4px_rgba(244,114,182,0.4)] bg-pink-500/10"
            : "hover:scale-[1.05] hover:bg-pink-500/15"
        }
        ${data.isImplicit ? "bg-pink-500/5" : "bg-pink-500/10"}
      `}
      style={{
        minWidth: "150px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0"
      />

      <div className="px-3 py-2">
        <p className="text-xl text-slate-300">{data.text}</p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0"
      />
    </div>
  );
}

export default QuestionNode;
