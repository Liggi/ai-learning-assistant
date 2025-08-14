import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { QuestionsLoadingIndicator } from "./questions-loading-indicator";

interface LoadingIndicatorsContainerProps {
  isGeneratingQuestions: boolean;
}

export const LoadingIndicatorsContainer: React.FC<LoadingIndicatorsContainerProps> = ({
  isGeneratingQuestions,
}) => {
  const isAnyLoading = isGeneratingQuestions;

  return (
    <AnimatePresence>
      {isAnyLoading && (
        <motion.div
          className="flex flex-row gap-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{
            opacity: 1,
            height: "auto",
            transition: {
              height: { duration: 0.3 },
              opacity: { duration: 0.2, delay: 0.1 },
            },
          }}
          exit={{
            opacity: 0,
            height: 0,
            transition: {
              height: { duration: 0.3, delay: 0.1 },
              opacity: { duration: 0.2 },
            },
          }}
        >
          <QuestionsLoadingIndicator isLoading={isGeneratingQuestions} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
