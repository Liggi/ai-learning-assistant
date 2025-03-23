import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  questions: string[];
  isLoading: boolean;
  isReady: boolean;
  onQuestionClick?: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  isLoading,
  isReady,
  onQuestionClick,
}) => {
  // Animation variants for container
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

  // Animation variants for questions
  const item = {
    hidden: { y: 100, opacity: 0 },
    show: { y: 0, opacity: 1 },
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
      {/* @TODO: If I remove this div, the questions don't show up */}
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
            className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 hover:border-slate-500 hover:scale-[1.02] shadow-sm hover:shadow-md text-sm transition-all duration-300 ease-in-out"
            onClick={() => onQuestionClick?.(question)}
          >
            {question}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
