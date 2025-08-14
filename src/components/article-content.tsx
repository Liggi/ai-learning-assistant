import React from "react";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";
import MarkdownDisplay from "./markdown-display";
import { useContextualTooltips } from "@/hooks/use-contextual-tooltips";
import { TooltipLoadingIndicator } from "./ui/tooltip-loading-indicator";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { useNavigate } from "@tanstack/react-router";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "ArticleContent", enabled: false });

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

  const createArticleMutation = useCreateArticleFromQuestion();
  const navigate = useNavigate();

  if (!article) {
    return null;
  }

  const handleLearnMoreRequest = (concept: string) => {
    const questionText = `Tell me more about ${concept.toLowerCase()}`;
    logger.info("Attempting to create article from 'Tell me more'", {
      concept,
      questionText,
      learningMapId: article.learningMapId,
      parentArticleId: article.id,
    });

    createArticleMutation.mutate(
      {
        learningMapId: article.learningMapId,
        parentArticleId: article.id,
        questionText: questionText,
      },
      {
        onSuccess: (data) => {
          logger.info(
            "Successfully created article from 'Tell me more':",
            data
          );
          navigate({
            to: "/learning/article/$articleId",
            params: { articleId: data.id },
            replace: true,
          });
        },
        onError: (error) => {
          logger.error("Failed to create article from 'Tell me more':", error);
        },
      }
    );
  };

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        <TooltipLoadingIndicator
          isLoading={isGeneratingTooltips || createArticleMutation.isPending}
        />
      </div>

      <MarkdownDisplay
        content={article.content}
        onLearnMore={handleLearnMoreRequest}
        tooltips={tooltips}
        tooltipsReady={tooltipsReady}
        isCreatingArticle={createArticleMutation.isPending}
      />
      {createArticleMutation.isError && (
        <p className="text-red-500 text-sm mt-4">
          Error creating related article: {createArticleMutation.error.message}
        </p>
      )}
    </div>
  );
};

export default ArticleContent;
