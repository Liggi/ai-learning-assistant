import { Handle, type NodeProps, Position, type Node as ReactFlowNode } from "@xyflow/react";

interface QuestionNodeData extends Record<string, unknown> {
  id: string;
  text: string;
  onClick?: (data: QuestionNodeData) => void;
}

type QuestionNodeProps = NodeProps<ReactFlowNode<QuestionNodeData>>;

export default function QuestionNode({ data }: QuestionNodeProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: React Flow nodes must be divs for proper positioning
    <div
      onClick={() => data.onClick?.(data)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          data.onClick?.(data);
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        background: "rgba(59, 130, 246, 0.1)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
      }}
      className="
        p-4 transition-all duration-200 cursor-pointer
        hover:bg-blue-900/20 hover:scale-[1.05]
        rounded-xl backdrop-blur-sm min-w-[200px] max-w-[200px]
      "
    >
      <div className="text-xs font-medium mb-2 text-blue-400">Question</div>

      <div className="text-gray-100 text-sm font-medium">{data.text}</div>

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0 !w-4 !h-4"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !w-4 !h-4"
      />
    </div>
  );
}
