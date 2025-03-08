import React from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { useStreamingLesson } from "@/hooks/use-streaming-lesson";
import { useTooltipGeneration } from "@/hooks/use-tooltip-generation";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { motion } from "framer-motion";
import { ErrorDisplay } from "./error-display";
import { SuggestedQuestions } from "./suggested-questions";
import { LoadingIndicatorsContainer } from "./ui/loading-indicators-container";

// Define the props interface for ChatLayout
interface ChatLayoutProps {
  moduleDetails: {
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
    message: string;
  };
  subjectId: string;
  moduleId: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  moduleDetails,
  subjectId,
  moduleId,
}) => {
  const { content, isLoading, error, refreshLesson, isStreamingComplete } =
    useStreamingLesson(moduleDetails);

  const { tooltips, isGeneratingTooltips, tooltipsReady, resetTooltips } =
    useTooltipGeneration({
      content,
      isStreamingComplete,
      subject: moduleDetails.subject,
      moduleTitle: moduleDetails.moduleTitle,
      moduleDescription: moduleDetails.moduleDescription,
    });

  const { questions, isGeneratingQuestions, questionsReady, resetQuestions } =
    useSuggestedQuestions({
      content,
      isStreamingComplete,
      subject: moduleDetails.subject,
      moduleTitle: moduleDetails.moduleTitle,
      moduleDescription: moduleDetails.moduleDescription,
    });

  // Handle API errors during streaming
  if (error) {
    return (
      <ErrorDisplay
        title="Error Loading Lesson"
        message="There was a problem loading the lesson content. Please try refreshing the page."
      />
    );
  }

  // Handle refreshing - coordinate both hooks
  const handleRefresh = () => {
    resetTooltips();
    resetQuestions();
    refreshLesson();
  };

  // Handle clicking on a suggested question
  const handleQuestionClick = (question: string) => {
    // This will be implemented later - for now just log
    console.log("Question clicked:", question);
    // To be replaced with actual implementation to send the question to the backend
  };

  // Handle clicking on "Tell me more about this" in tooltips
  const handleLearnMore = (concept: string) => {
    // This will be implemented later - for now just log
    console.log("Learn more about:", concept);
    // To be replaced with actual implementation to send the concept to the backend
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <div className="w-1/3 h-full border-r border-slate-700 relative">
        <button
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md
                   text-xs font-medium transition-all duration-150
                   bg-slate-800/50 border border-slate-700/50
                   hover:bg-slate-800 hover:border-slate-700"
        >
          <LayoutGrid size={12} className="text-slate-400" />
          <span className="text-slate-300">Learning Plan</span>
        </button>
      </div>

      <div className="w-2/3 h-full">
        <div className="flex-1 flex flex-col h-screen bg-slate-900 text-slate-300">
          <div className="flex-shrink-0 px-8 py-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-slate-200">
                {moduleDetails.moduleTitle}
              </h2>
              <p className="text-sm text-slate-400/80 mt-1">
                {moduleDetails.moduleDescription}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LoadingIndicatorsContainer
                isGeneratingTooltips={isGeneratingTooltips}
                isGeneratingQuestions={isGeneratingQuestions}
              />
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`p-2 rounded-md transition-all duration-150 ${
                  isLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-slate-800 active:bg-slate-700"
                }`}
                aria-label="Refresh lesson"
              >
                <RefreshCw
                  size={16}
                  className={`text-slate-400 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          <div className="p-8 overflow-y-auto">
            {isLoading && content === "" ? (
              <div className="animate-pulse space-y-4">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-700/30 rounded w-3/5"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-11/12"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-4/5"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-5 bg-slate-700/30 rounded w-2/5"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-11/12"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="h-5 bg-slate-700/30 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-5/6"></div>
                  </div>
                </div>

                <div className="h-24 bg-slate-700/20 rounded w-full"></div>
              </div>
            ) : (
              <>
                <MarkdownDisplay
                  content={content}
                  tooltips={tooltips}
                  tooltipsReady={tooltipsReady}
                  onLearnMore={handleLearnMore}
                />

                {!isLoading && (
                  <SuggestedQuestions
                    questions={questions}
                    isLoading={isGeneratingQuestions}
                    isReady={questionsReady}
                    onQuestionClick={handleQuestionClick}
                  />
                )}
              </>
            )}

            {isLoading && content !== "" && (
              <div className="mt-2 inline-block">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLayout;
