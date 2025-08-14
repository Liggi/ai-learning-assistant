import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { useContextualTooltips } from "@/hooks/use-contextual-tooltips";
import { Logger } from "@/lib/logger";
import type { SerializedArticle, SerializedSubject } from "@/types/serialized";
import MarkdownDisplay from "./markdown-display";

const logger = new Logger({ context: "ArticleContent", enabled: false });

interface ArticleContentProps {
  article: SerializedArticle | null | undefined;
  subject: SerializedSubject;
}

const ArticleContent: React.FC<ArticleContentProps> = ({ article, subject }) => {
  const { tooltips } = useContextualTooltips(article, subject);

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
          logger.info("Successfully created article from 'Tell me more':", data);
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
      <MarkdownDisplay
        content={article.content}
        onLearnMore={handleLearnMoreRequest}
        tooltips={tooltips}
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
