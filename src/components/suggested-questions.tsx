import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { Logger } from "@/lib/logger";
import type { SerializedArticle, SerializedSubject } from "@/types/serialized";

const logger = new Logger({
  context: "SuggestedQuestions",
  enabled: false,
});

interface SuggestedQuestionsContentProps {
  subject: SerializedSubject;
  article: SerializedArticle;
  onArticleCreated?: (articleId: string) => void;
  onQuestionCreated?: (questionText: string, parentArticleId: string) => void;
}

const SuggestedQuestionsContent: React.FC<SuggestedQuestionsContentProps> = ({
  subject,
  article,
  onArticleCreated,
  onQuestionCreated,
}) => {
  const { questions, isGeneratingQuestions } = useSuggestedQuestions(subject, article);

  const createArticleMutation = useCreateArticleFromQuestion();
  const navigate = useNavigate();

  const handleQuestionClick = (question: string) => {
    logger.info("Attempting to create article from question", {
      question,
      learningMapId: article.learningMapId,
      parentArticleId: article.id,
    });

    // Call the onQuestionCreated callback immediately to add the question node to the map
    if (onQuestionCreated) {
      onQuestionCreated(question, article.id);
    }

    createArticleMutation.mutate(
      {
        learningMapId: article.learningMapId,
        parentArticleId: article.id,
        questionText: question,
      },
      {
        onSuccess: (data) => {
          logger.info("Successfully created article from question:", data);
          if (onArticleCreated) {
            onArticleCreated(data.id);
          } else {
            navigate({
              to: "/learning/article/$articleId",
              params: { articleId: data.id },
              replace: true,
            });
          }
        },
        onError: (error) => {
          logger.error("Failed to create article from question:", error);
        },
      }
    );
  };

  if (isGeneratingQuestions) {
    return <SuggestedQuestionsSkeleton />;
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            type="button"
            className={`px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 hover:border-slate-500 shadow-sm hover:shadow-md text-sm transition-all duration-300 ease-in-out ${
              createArticleMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => handleQuestionClick(question)}
            disabled={createArticleMutation.isPending}
          >
            {createArticleMutation.isPending &&
            createArticleMutation.variables?.questionText === question
              ? "Creating..."
              : question}
          </button>
        ))}
        {createArticleMutation.isError && (
          <p className="text-red-500 text-sm mt-2 w-full">
            Error: {createArticleMutation.error.message}
          </p>
        )}
      </div>
    </div>
  );
};

const SuggestedQuestionsSkeleton: React.FC = () => {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-56 rounded-lg" />
        <Skeleton className="h-10 w-80 rounded-lg" />
      </div>
    </div>
  );
};

interface SuggestedQuestionsProps {
  subject: SerializedSubject | null | undefined; // Can be null
  article: SerializedArticle | null | undefined; // Can be null
  onArticleCreated?: (articleId: string) => void;
  onQuestionCreated?: (questionText: string, parentArticleId: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  subject,
  article,
  onArticleCreated,
  onQuestionCreated,
}) => {
  if (!article || !subject || !article.content) {
    return <SuggestedQuestionsSkeleton />;
  }

  return (
    <SuggestedQuestionsContent
      subject={subject}
      article={article as SerializedArticle & { content: string }}
      onArticleCreated={onArticleCreated}
      onQuestionCreated={onQuestionCreated}
    />
  );
};
