import { Handle, Position } from "@xyflow/react";

interface ConversationNodeData {
  id: string;
  text: string;
  summary: string;
  isUser: boolean;
  onClick?: (data: ConversationNodeData) => void;
}

interface ConversationNodeProps {
  data: ConversationNodeData;
  isConnectable?: boolean;
  selected?: boolean;
}

export default function ConversationNode({
  data,
  selected,
}: ConversationNodeProps) {
  return (
    <div
      onClick={() => data.onClick?.(data)}
      className={`
        rounded-full px-4 py-2 shadow-lg border backdrop-blur-sm
        ${
          data.isUser
            ? `bg-gradient-to-r from-blue-600/20 to-cyan-500/20 border-blue-400/30
               ${selected ? "from-blue-600/40 to-cyan-500/40 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : ""}`
            : `bg-slate-800/60 border-slate-700/50
               ${selected ? "bg-slate-700/80 border-slate-600/70 shadow-[0_0_15px_rgba(148,163,184,0.2)]" : ""}`
        }
        transition-all duration-200 ease-in-out
        ${selected ? "scale-105" : "hover:scale-[1.02]"}
        cursor-pointer pointer-events-auto
        min-w-[100px] max-w-[250px] w-fit group
      `}
    >
      <div
        className={`
          text-sm text-center break-words
          ${data.isUser ? "text-blue-50 font-medium" : "text-slate-200"}
        `}
      >
        {data.summary}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-4 !h-4"
        style={{
          background: "transparent",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-4 !h-4"
        style={{
          background: "transparent",
        }}
      />
    </div>
  );
}
