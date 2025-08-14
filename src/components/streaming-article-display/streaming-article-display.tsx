import type React from "react";
import { useStreamArticleContent } from "@/hooks/use-stream-article-content";
import type { SerializedArticle, SerializedSubject } from "@/types/serialized";
import MarkdownDisplay from "../markdown-display";

interface StreamingArticleDisplayProps {
  article: SerializedArticle;
  subject: SerializedSubject;
}

const StreamingArticleDisplay: React.FC<StreamingArticleDisplayProps> = ({ article, subject }) => {
  const { content, isStreaming } = useStreamArticleContent(article, subject.title);

  return (
    <div className="relative">
      <MarkdownDisplay content={content || ""} tooltips={{}} />

      {/* Show streaming indicator only when actually streaming */}
      {isStreaming && (
        <div className="mt-4 flex items-center justify-center text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
            <span className="animate-bounce delay-300">.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingArticleDisplay;
