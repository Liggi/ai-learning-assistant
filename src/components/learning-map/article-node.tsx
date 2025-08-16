import { useParams } from "@tanstack/react-router";
import { Handle, type NodeProps, Position, type Node as ReactFlowNode } from "@xyflow/react";
import MarkdownDisplay from "../markdown-display";
import { Skeleton } from "../ui/skeleton";

interface ArticleNodeData extends Record<string, unknown> {
  id: string;
  content: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  onClick?: (data: ArticleNodeData) => void;
}

type ArticleNodeProps = NodeProps<ReactFlowNode<ArticleNodeData>>;

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

export default function ArticleNode({ data }: ArticleNodeProps) {
  const params = useParams({ strict: false }) as {
    articleId?: string;
    subjectId?: string;
  };
  const urlArticleId = params.articleId;

  const isUrlSelected =
    (!!urlArticleId && urlArticleId === data.id) || (!urlArticleId && data.isRoot === true);

  const isQuestionType = data.isUser;
  const style = isQuestionType ? nodeStyles.question : nodeStyles.answer;

  // Show loading skeleton if article has no summary (content is streaming)
  const isLoading =
    !isQuestionType && (!data.content.summary || data.content.summary.trim() === "");

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
      style={style}
      className={`
        p-4 transition-all duration-200 cursor-pointer
        ${isQuestionType ? "hover:bg-blue-900/20" : "hover:bg-green-900/20"}
        ${
          isUrlSelected
            ? "scale-[1.10] ring-3 ring-green-500/30 shadow-[0_0_10px_4px_rgba(16,185,129,0.45)]"
            : "hover:scale-[1.05]"
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
        <>
          {/* Loading skeleton for summary */}
          <div className="space-y-2 mb-3">
            <Skeleton className="h-4 w-full bg-slate-700/50" />
            <Skeleton className="h-4 w-4/5 bg-slate-700/50" />
            <Skeleton className="h-4 w-3/4 bg-slate-700/50" />
          </div>

          {/* Loading skeleton for takeaways */}
          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <div className="flex items-start gap-2">
              <Skeleton className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-700/50" />
              <Skeleton className="h-3 w-3/4 bg-slate-700/50" />
            </div>
            <div className="flex items-start gap-2">
              <Skeleton className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-700/50" />
              <Skeleton className="h-3 w-2/3 bg-slate-700/50" />
            </div>
            <div className="flex items-start gap-2">
              <Skeleton className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-700/50" />
              <Skeleton className="h-3 w-4/5 bg-slate-700/50" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-gray-100 text-sm font-medium mb-3">{data.content.summary}</div>

          {data.content.takeaways && data.content.takeaways.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
              {data.content.takeaways.map((takeaway) => (
                <div key={takeaway} className="flex items-start gap-2 text-xs text-slate-300">
                  <div className="mt-2 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0" />
                  <div>
                    <MarkdownDisplay content={takeaway} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
