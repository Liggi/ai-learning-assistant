import React from "react";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import MarkdownDisplay from "./markdown-display";
import { useContextualTooltips } from "@/hooks/use-contextual-tooltips";
import { TooltipLoadingIndicator } from "./ui/tooltip-loading-indicator";

interface ArticleContentProps {
  article: SerializedArticle | null | undefined;
  subject: SerializedSubject;
}

const ArticleContent: React.FC<ArticleContentProps> = ({
  article,
  subject,
}) => {
  const { tooltips, isGeneratingTooltips, tooltipsReady } =
    useContextualTooltips(article, subject);

  if (!article) {
    return null;
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        <TooltipLoadingIndicator isLoading={isGeneratingTooltips} />
      </div>

      <MarkdownDisplay
        content={article.content}
        onLearnMore={() => {
          console.log("Learn more");
        }}
        tooltips={tooltips}
        tooltipsReady={tooltipsReady}
      />
    </div>
  );
};

export default ArticleContent;
