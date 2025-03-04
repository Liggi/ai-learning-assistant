import { Handle, Position } from "@xyflow/react";
import { useRef, useEffect, useCallback } from "react";
import { useConversationStore } from "@/features/chat/store";
import debounce from "lodash/debounce";

interface ConversationNodeData {
  id: string;
  text: string;
  summary: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  onClick?: (data: ConversationNodeData) => void;
}

interface ConversationNodeProps {
  data: ConversationNodeData;
  isConnectable?: boolean;
  selected?: boolean;
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
}: ConversationNodeProps) {
  const isQuestion = data.isUser;
  const style = isQuestion ? nodeStyles.question : nodeStyles.answer;
  const containerRef = useRef<HTMLDivElement>(null);
  const setNodeHeight = useConversationStore((state) => state.setNodeHeight);
  const lastHeightRef = useRef<number>(0);

  // Create a debounced update function that only triggers if height changed significantly
  const debouncedUpdateHeight = useCallback(
    debounce((height: number) => {
      // Only update if the height has changed by at least 5px to avoid minor fluctuations
      if (Math.abs(height - lastHeightRef.current) > 5) {
        lastHeightRef.current = height;
        setNodeHeight(data.id, height);
      }
    }, 150),
    [data.id, setNodeHeight]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Set initial height
    const initialHeight = containerRef.current.offsetHeight;
    if (initialHeight > 0 && lastHeightRef.current === 0) {
      lastHeightRef.current = initialHeight;
      setNodeHeight(data.id, initialHeight);
    }

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
  }, [data.id, debouncedUpdateHeight]);

  return (
    <div
      ref={containerRef}
      onClick={() => data.onClick?.(data)}
      style={style}
      className={`
        p-4 transition-all duration-200
        ${isQuestion ? "hover:bg-blue-900/20" : "hover:bg-green-900/20"}
        ${selected ? "scale-105 shadow-lg" : "hover:scale-[1.02]"}
        rounded-xl backdrop-blur-sm min-w-[320px]
      `}
    >
      <div
        className={`
        text-xs font-medium mb-2
        ${isQuestion ? "text-blue-400" : "text-green-400"}
      `}
      >
        {isQuestion ? "Question" : "Learning"}
      </div>

      {data.content ? (
        <>
          <div className="text-gray-100 text-sm font-medium mb-3">
            {data.content.summary}
          </div>
          {data.content.takeaways.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
              {data.content.takeaways.map((takeaway, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs text-slate-300"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0" />
                  <div>{takeaway}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-100 text-sm">{data.summary}</div>
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
