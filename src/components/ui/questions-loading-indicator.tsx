import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText } from "lucide-react";

interface QuestionsLoadingIndicatorProps {
  isLoading: boolean;
}

export const QuestionsLoadingIndicator: React.FC<
  QuestionsLoadingIndicatorProps
> = ({ isLoading }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="text-xs text-slate-300 flex items-center px-3 py-1.5 rounded-md bg-slate-800/70 border border-slate-700/30"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mr-2 flex-shrink-0"
          >
            <MessageSquareText size={12} className="text-green-400" />
          </motion.div>
          <span className="flex items-center">
            Generating questions
            <span className="inline-flex ml-1">
              <span className="animate-[bounce_1.4s_infinite_0.1s]">.</span>
              <span className="animate-[bounce_1.4s_infinite_0.2s]">.</span>
              <span className="animate-[bounce_1.4s_infinite_0.3s]">.</span>
            </span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
