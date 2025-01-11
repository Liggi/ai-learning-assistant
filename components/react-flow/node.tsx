import { Handle, Position } from "@xyflow/react";

interface NodeData {
  label: string;
  description: string;
  status: "not-started" | "in-progress" | "completed";
  progress?: number;
}

interface NodeProps {
  data: NodeData;
}

function Node({ data }: NodeProps) {
  const getStatusColor = () => {
    switch (data.status) {
      case "completed":
        return "bg-emerald-400";
      case "in-progress":
        return "bg-amber-400";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="max-w-[280px] rounded-xl overflow-hidden flex flex-col bg-slate-900 border border-slate-700 shadow-lg shadow-slate-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/70 hover:border-slate-600 relative">
      <Handle
        type="target"
        position={Position.Top}
        id="a"
        style={{ background: "transparent", border: "none" }}
      />
      <div className="px-5 py-3 border-b border-slate-700">
        <h3
          className="font-bold text-base text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400"
          title={data.label}
        >
          {data.label}
        </h3>
      </div>
      <div className="p-5 flex-grow bg-slate-800/50 backdrop-blur-sm">
        <p className="text-sm text-slate-300" title={data.description}>
          {data.description}
        </p>
      </div>
      <div
        className={`h-1 absolute bottom-0 left-0 ${getStatusColor()}`}
        style={{
          width:
            data.status === "in-progress" && data.progress !== undefined
              ? `${data.progress}%`
              : "100%",
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ background: "transparent", border: "none" }}
      />
    </div>
  );
}

export default Node;
