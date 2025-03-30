import React from "react";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import MarkdownDisplay from "./markdown-display";
import { useContextualTooltips } from "@/hooks/use-contextual-tooltips";

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
