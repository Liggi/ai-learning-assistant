import { Handle, Position } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

interface ArticleNodeData {
  id: string;
  content: string;
  summary: string;
  isRoot: boolean;
  takeaways?: string[];
}

interface ArticleNodeProps {
  data: ArticleNodeData;
  selected?: boolean;
  setNodeHeight?: (nodeId: string, height: number) => void;
}

function ArticleNode({
  data,
  selected = false,
  setNodeHeight,
}: ArticleNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Report node height when it changes
  useEffect(() => {
    if (nodeRef.current && setNodeHeight) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setNodeHeight(data.id, entry.contentRect.height);
        }
      });

      observer.observe(nodeRef.current);
      return () => observer.disconnect();
    }
  }, [data.id, setNodeHeight]);

  return (
    <div
      ref={nodeRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        max-w-[280px] rounded-xl overflow-hidden flex flex-col border
        shadow-lg backdrop-blur-sm 
        transition-all duration-300 ease-in-out 
        cursor-pointer
        group
        relative
        ${
          selected
            ? "shadow-xl border-blue-500 ring-2 ring-blue-500/50 bg-slate-800/90"
            : isHovered
              ? "shadow-xl border-slate-500 bg-slate-800/90"
              : "border-slate-700 bg-slate-900/90"
        }
      `}
      style={{
        minWidth: "220px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-0"
      />
      <div className="px-5 py-3 border-b border-slate-700 group-hover:border-slate-600">
        <div className="flex items-center gap-2">
          {data.isRoot && (
            <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded-full">
              Root
            </span>
          )}
          <h3
            className={`
              font-medium text-sm text-transparent bg-clip-text 
              bg-gradient-to-r from-sky-400 to-indigo-400
              group-hover:from-sky-300 group-hover:to-indigo-300
            `}
          >
            Article
          </h3>
        </div>
      </div>

      <div className="p-4 flex-grow bg-slate-800/50 backdrop-blur-sm group-hover:bg-slate-700/50">
        <p className="text-sm text-slate-300 group-hover:text-slate-200 line-clamp-3">
          {data.summary}
        </p>

        {data.takeaways && data.takeaways.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <h4 className="text-xs text-slate-400 mb-2">Key Takeaways:</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              {data.takeaways.slice(0, 2).map((takeaway, i) => (
                <li key={i} className="line-clamp-1">
                  {takeaway}
                </li>
              ))}
              {data.takeaways.length > 2 && (
                <li className="text-slate-500 italic">+ more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div
        className={`h-1 absolute bottom-0 left-0 transition-all duration-300 
          ${data.isRoot ? "bg-blue-500" : "bg-indigo-500"}`}
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

export default ArticleNode;
