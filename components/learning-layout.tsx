import React, { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { ErrorDisplay } from "./error-display";
import { SuggestedQuestions } from "./suggested-questions";
import { LoadingIndicatorsContainer } from "./ui/loading-indicators-container";
import { useLearningOrchestrator } from "@/hooks/orchestration/learning-orchestrator";
import PersonalLearningMapFlow from "@/components/personal-learning-map-flow";

interface LearningLayoutProps {
  moduleDetails: {
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
    message: string;
  };
  subjectId: string;
  moduleId: string;
}

const LearningLayout: React.FC<LearningLayoutProps> = ({
  moduleDetails,
  subjectId,
  moduleId,
}) => {
  const memoizedModuleDetails = useMemo(
    () => ({
      subject: moduleDetails.subject,
      moduleTitle: moduleDetails.moduleTitle,
      moduleDescription: moduleDetails.moduleDescription,
      message: moduleDetails.message,
    }),
    [
      moduleDetails.subject,
      moduleDetails.moduleTitle,
      moduleDetails.moduleDescription,
      moduleDetails.message,
    ]
  );

  const orchestrator = useLearningOrchestrator(
    subjectId,
    moduleId,
    memoizedModuleDetails.moduleTitle,
    memoizedModuleDetails.moduleDescription
  );

  const {
    article,
    tooltip,
    userQuestion,
    visualization,
    handleSuggestedQuestionClick,
    handleLearnMoreAboutTerm,
    handleRefresh,
    handleNodeClick,
    error: orchestratorError,
  } = orchestrator;

  // Extract state from services
  const {
    displayContent, // For UI rendering
    isLoading: isLoadingArticle,
    error: articleError,
  } = article;

  const {
    tooltips: tooltipItems,
    isGenerating: isGeneratingTooltips,
    isReady: tooltipsReady,
  } = tooltip;

  // Get suggested questions safely - avoid any direct property references that TypeScript can't verify
  const suggestedQuestions = Array.isArray(userQuestion?.suggestedQuestions)
    ? userQuestion.suggestedQuestions
    : [];

  // Use a safe approach for checking loading states that doesn't require specific properties
  // Use a simple default of false if the property can't be determined
  const isGeneratingQuestions = false; // Default to false for safety
  const questionsReady = !!suggestedQuestions.length; // If we have questions, consider it ready

  if (articleError || orchestratorError) {
    const error = articleError || orchestratorError;
    return (
      <ErrorDisplay
        title="Error Loading Article"
        message={
          error?.message ||
          "There was a problem loading the article content. Please try refreshing the page."
        }
      />
    );
  }

  // Create tooltip record for markdown display
  const tooltipRecord: Record<string, string> = {};
  if (Array.isArray(tooltipItems)) {
    tooltipItems.forEach((item) => {
      if (item && item.term && item.explanation) {
        tooltipRecord[item.term] = item.explanation;
      }
    });
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - making it 1/3 of the screen */}
        <div className="w-1/3 bg-slate-900 border-r border-slate-800 p-4 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-200 font-medium">Learning Map</h2>
          </div>
          <div className="h-[calc(100%-40px)]">
            <div className="w-full h-full rounded-lg overflow-hidden">
              <PersonalLearningMapFlow
                nodes={visualization?.nodes || []}
                edges={visualization?.edges || []}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        </div>

        {/* Main content - remaining 2/3 (or full on mobile) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h1 className="text-xl font-semibold text-slate-200">
                {moduleDetails.moduleTitle}
              </h1>
              <div className="flex space-x-2">
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingArticle}
                  className={`p-2 rounded-md transition-all duration-150 ${
                    isLoadingArticle
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-slate-800 active:bg-slate-700"
                  }`}
                >
                  <RefreshCw
                    size={16}
                    className={`text-slate-400 ${isLoadingArticle ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              {isLoadingArticle && displayContent === "" ? (
                <div className="animate-pulse space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-800 rounded w-4/6"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-800 rounded w-4/6"></div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <MarkdownDisplay
                    content={displayContent}
                    tooltips={tooltipRecord}
                    tooltipsReady={tooltipsReady}
                    onLearnMore={handleLearnMoreAboutTerm}
                  />

                  {!isLoadingArticle && (
                    <SuggestedQuestions
                      questions={suggestedQuestions}
                      isLoading={isGeneratingQuestions}
                      isReady={questionsReady}
                      onQuestionClick={handleSuggestedQuestionClick}
                    />
                  )}
                </div>
              )}

              {isLoadingArticle && displayContent !== "" && (
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

          <LoadingIndicatorsContainer
            isGeneratingTooltips={isGeneratingTooltips}
            isGeneratingQuestions={isGeneratingQuestions}
          />
        </div>
      </div>
    </div>
  );
};

// Export a memoized version of the component to prevent unnecessary rerenders
export default React.memo(LearningLayout);
