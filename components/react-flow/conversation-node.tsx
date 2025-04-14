import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import { useRef, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import { useArticle } from "@/hooks/api/articles";
import { useArticleSummary } from "@/hooks/use-article-summary";
import MarkdownDisplay from "../markdown-display";
import { useArticleTakeaways } from "@/hooks/use-article-takeaways";
import { useParams } from "@tanstack/react-router";

interface ConversationNodeData {
  id: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  isRoot?: boolean;
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
  setNodeHeight,
}: ConversationNodeProps) {
  const params = useParams({ strict: false }) as {
    articleId?: string;
    subjectId?: string;
  };
  const urlArticleId = params.articleId;

  const isUrlSelected =
    (!!urlArticleId && urlArticleId === data.id) ||
    (!urlArticleId && data.isRoot === true);

  const isQuestionType = data.isUser;
  const style = isQuestionType ? nodeStyles.question : nodeStyles.answer;

  const containerRef = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);

  const { data: article, isLoading: isLoadingArticle } = useArticle(data.id);

  const { data: summary, loading: isLoadingSummary } =
    useArticleSummary(article);

  const { data: takeaways, loading: isLoadingTakeaways } =
    useArticleTakeaways(article);

  const isLoading =
    isLoadingArticle || isLoadingSummary || !summary || isLoadingTakeaways;

  const debouncedUpdateHeight = useCallback(
    debounce((height: number) => {
      if (height !== lastHeightRef.current && setNodeHeight) {
        lastHeightRef.current = height;
        setNodeHeight(data.id, height);
      }
    }, 100),
    [data.id, setNodeHeight]
  );

  const updateNodeInternals = useUpdateNodeInternals();

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

  useEffect(() => {
    if (!isLoading) {
      updateNodeInternals(data.id);
    }
  }, [isLoading, data.id, updateNodeInternals]);

  return (
    <div
      ref={containerRef}
      onClick={() => data.onClick?.(data)}
      style={style}
      className={`
        p-4 transition-all duration-200
        ${isQuestionType ? "hover:bg-blue-900/20" : "hover:bg-green-900/20"}
        ${
          isUrlSelected
            ? "scale-105 shadow-lg bg-red-500/80 ring-2 ring-red-400"
            : "hover:scale-[1.02]"
        }
        rounded-xl backdrop-blur-sm min-w-[350px] max-w-[350px]
      `}
    >
      <div
        className={`
        text-xs font-medium mb-2
        ${isQuestionType ? "text-blue-400" : "text-green-400"}
      `}
      >
        {isQuestionType ? "Question" : "Article"}
      </div>

      {isLoading ? (
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
      ) : summary ? (
        <>
          <div className="text-gray-100 text-sm font-medium mb-3">
            {summary}
          </div>
          {takeaways && takeaways.length > 0 && (
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
