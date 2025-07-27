import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TooltipLoadingIndicator } from "./tooltip-loading-indicator";
import { QuestionsLoadingIndicator } from "./questions-loading-indicator";

interface LoadingIndicatorsContainerProps {
  isGeneratingTooltips: boolean;
  isGeneratingQuestions: boolean;
}

export const LoadingIndicatorsContainer: React.FC<
  LoadingIndicatorsContainerProps
> = ({ isGeneratingTooltips, isGeneratingQuestions }) => {
  const isAnyLoading = isGeneratingTooltips || isGeneratingQuestions;

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
          <TooltipLoadingIndicator isLoading={isGeneratingTooltips} />
          <QuestionsLoadingIndicator isLoading={isGeneratingQuestions} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
