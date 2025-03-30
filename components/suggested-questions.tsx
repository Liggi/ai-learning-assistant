import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { Logger } from "@/lib/logger";
import { useNavigate } from "@tanstack/react-router";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { SerializedArticle, SerializedSubject } from "@/types/serialized";

const logger = new Logger({
  context: "SuggestedQuestions",
  enabled: false,
});

interface SuggestedQuestionsProps {
  subject: SerializedSubject;
  article: SerializedArticle;
  onQuestionClick?: (question: string) => void;
  onArticleCreated?: (articleId: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  subject,
  article,
  onQuestionClick,
  onArticleCreated,
}) => {
  const { questions, isGeneratingQuestions } = useSuggestedQuestions(
    subject,
    article
  );

  const createArticleMutation = useCreateArticleFromQuestion();
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { y: 100, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  const handleQuestionClick = (question: string) => {
    onQuestionClick?.(question);

    logger.info("Attempting to create article from question", {
      question,
      learningMapId: article.learningMapId,
      parentArticleId: article.id,
    });
    createArticleMutation.mutate(
      {
        learningMapId: article.learningMapId,
        parentArticleId: article.id,
        questionText: question,
      },
      {
        onSuccess: (data) => {
          logger.info("Successfully created article from question:", data);

          navigate({
            to: "/learning/article/$articleId",
            params: { articleId: data.id },
          });
        },
        onError: (error) => {
          logger.error("Failed to create article from question:", error);
        },
      }
    );
  };

  if (isGeneratingQuestions) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400 mt-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={14} />
        </motion.div>
        <span>Generating questions...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <div>
      <div></div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-wrap gap-2"
      >
        {questions.map((question, index) => (
          <motion.button
            key={index}
            variants={item}
            className={`px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 hover:border-slate-500 hover:scale-[1.02] shadow-sm hover:shadow-md text-sm transition-all duration-300 ease-in-out ${
              createArticleMutation.isPending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            onClick={() => handleQuestionClick(question)}
            disabled={createArticleMutation.isPending}
          >
            {createArticleMutation.isPending &&
            createArticleMutation.variables?.questionText === question
              ? "Creating..."
              : question}
          </motion.button>
        ))}
        {createArticleMutation.isError && (
          <p className="text-red-500 text-sm mt-2 w-full">
            Error: {createArticleMutation.error.message}
          </p>
        )}
      </motion.div>
    </div>
  );
};
