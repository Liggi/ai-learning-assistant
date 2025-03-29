import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { Logger } from "@/lib/logger";
import { useNavigate } from "@tanstack/react-router";

const logger = new Logger({
  context: "SuggestedQuestions",
  enabled: true,
});

interface SuggestedQuestionsProps {
  questions: string[];
  isLoading: boolean;
  isReady: boolean;
  onQuestionClick?: (question: string) => void;
  onArticleCreated?: (articleId: string) => void;
  learningMapId: string;
  currentArticleId: string;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  isLoading,
  isReady,
  onQuestionClick,
  onArticleCreated,
  learningMapId,
  currentArticleId,
}) => {
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
      learningMapId,
      parentArticleId: currentArticleId,
    });
    createArticleMutation.mutate(
      {
        learningMapId: learningMapId,
        parentArticleId: currentArticleId,
        questionText: question,
      },
      {
        onSuccess: (data) => {
          logger.info("Successfully created article from question:", data);

          // Call onArticleCreated before navigation to ensure parent components are notified
          if (onArticleCreated) {
            onArticleCreated(data.id);
          }

          // Add a small delay before navigation to ensure state updates have propagated
          setTimeout(() => {
            // Navigate to the new article route
            navigate({
              to: "/learning/article/$articleId",
              params: { articleId: data.id },
              // Use replace to prevent back button from returning to the current article
              replace: true,
            });
          }, 10);
        },
        onError: (error) => {
          logger.error("Failed to create article from question:", error);
        },
      }
    );
  };

  if (isLoading) {
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

  if (!isReady || questions.length === 0) {
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
