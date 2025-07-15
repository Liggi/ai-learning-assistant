import {
  Handle,
  Position,
  type NodeProps,
  type Node as ReactFlowNode,
} from "@xyflow/react";
import { useParams } from "@tanstack/react-router";
import MarkdownDisplay from "../markdown-display";

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
    (!!urlArticleId && urlArticleId === data.id) ||
    (!urlArticleId && data.isRoot === true);

  const isQuestionType = data.isUser;
  const style = isQuestionType ? nodeStyles.question : nodeStyles.answer;

  return (
    <div
      onClick={() => data.onClick?.(data)}
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

      <div className="text-gray-100 text-sm font-medium mb-3">
        {data.content.summary}
      </div>
      
      {data.content.takeaways && data.content.takeaways.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
          {data.content.takeaways.map((takeaway, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs text-slate-300"
            >
              <div className="mt-2 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0" />
              <div>
                <MarkdownDisplay content={takeaway} />
              </div>
            </div>
          ))}
        </div>
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