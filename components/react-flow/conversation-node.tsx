import { Handle, Position } from "@xyflow/react";
import { useRef, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import MarkdownDisplay from "../markdown-display";

interface ConversationNodeData {
  id: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  isLoading?: boolean;
  onClick?: (data: ConversationNodeData) => void;
}

interface ConversationNodeProps {
  data: ConversationNodeData;
  isConnectable?: boolean;
  selected?: boolean;
  setNodeHeight?: (nodeId: string, height: number) => void;
}

const nodeStyles = {
  question: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
  },
  answer: {
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.2)",
  },
};

export default function ConversationNode({
  data,
  selected,
  setNodeHeight,
}: ConversationNodeProps) {
  const isQuestion = data.isUser;
  const style = isQuestion ? nodeStyles.question : nodeStyles.answer;
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);

  // Create a debounced update function that only triggers if height changed
  const debouncedUpdateHeight = useCallback(
    debounce((height: number) => {
      if (height !== lastHeightRef.current && setNodeHeight) {
        lastHeightRef.current = height;
        setNodeHeight(data.id, height);
      }
    }, 100),
    [data.id, setNodeHeight]
  );

  useEffect(() => {
    if (!containerRef.current || !setNodeHeight) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize[0]?.blockSize;
        if (height && height > 0) {
          debouncedUpdateHeight(height);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      debouncedUpdateHeight.cancel();
    };
  }, [data.id, debouncedUpdateHeight, setNodeHeight]);

  // Ensure takeaways is always an array
  const takeaways = data.content?.takeaways || [];

  return (
    <div
      ref={containerRef}
      onClick={() => data.onClick?.(data)}
      style={style}
      className={`
        p-4 transition-all duration-200
        ${isQuestion ? "hover:bg-blue-900/20" : "hover:bg-green-900/20"}
        ${selected ? "scale-105 shadow-lg" : "hover:scale-[1.02]"}
        rounded-xl backdrop-blur-sm min-w-[350px] max-w-[350px]
      `}
    >
      <div
        className={`
        text-xs font-medium mb-2
        ${isQuestion ? "text-blue-400" : "text-green-400"}
      `}
      >
        {isQuestion ? "Question" : "Article"}
      </div>

      {data.isLoading ? (
        <div className="py-2">
          <div className="h-4 bg-slate-700/40 rounded animate-pulse mb-2 w-3/4"></div>
          <div className="h-3 bg-slate-700/40 rounded animate-pulse mb-1.5 w-full"></div>
          <div className="h-3 bg-slate-700/40 rounded animate-pulse mb-1.5 w-5/6"></div>
          <div className="h-3 bg-slate-700/40 rounded animate-pulse w-4/6"></div>
          <div className="mt-3 pt-2 border-t border-slate-700/50">
            <div className="flex items-start gap-2 mb-1.5">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0"></div>
              <div className="h-2.5 bg-slate-700/40 rounded animate-pulse w-4/5"></div>
            </div>
            <div className="flex items-start gap-2 mb-1.5">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0"></div>
              <div className="h-2.5 bg-slate-700/40 rounded animate-pulse w-3/5"></div>
            </div>
          </div>
        </div>
      ) : data.content ? (
        <>
          <div className="text-gray-100 text-sm font-medium mb-3">
            {data.content.summary}
          </div>
          {takeaways.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
              {takeaways.map((takeaway, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs text-slate-300"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0" />
                  <div>
                    <MarkdownDisplay content={takeaway} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-sm italic">No content available</div>
      )}

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
