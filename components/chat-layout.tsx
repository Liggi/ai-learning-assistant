import React, { useEffect, useRef, useMemo } from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { ErrorDisplay } from "./error-display";
import { SuggestedQuestions } from "./suggested-questions";
import { LoadingIndicatorsContainer } from "./ui/loading-indicators-container";
import { useConversationOrchestrator } from "@/hooks/orchestration/use-conversation-orchestrator";
import ConversationFlow from "./conversation-flow";

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

  const orchestrator = useConversationOrchestrator(
    subjectId,
    moduleId,
    memoizedModuleDetails.moduleTitle,
    memoizedModuleDetails.moduleDescription
  );

  const {
    lesson,
    tooltips,
    questions,
    conversation,
    visualization,
    handleQuestionClick,
    handleLearnMore,
    handleRefresh,
    handleNodeClick,
    error: orchestratorError,
  } = orchestrator;

  // Extract state from services
  const {
    displayContent, // For UI rendering
    content, // For service processing
    isLoading: isLoadingLesson,
    error: lessonError,
    isComplete: isStreamingComplete,
  } = lesson;

  const {
    tooltips: tooltipItems,
    isGenerating: isGeneratingTooltips,
    isReady: tooltipsReady,
  } = tooltips;

  const {
    questions: questionItems,
    isGenerating: isGeneratingQuestions,
    isReady: questionsReady,
  } = questions;

  if (lessonError || orchestratorError) {
    const error = lessonError || orchestratorError;
    return (
      <ErrorDisplay
        title="Error Loading Lesson"
        message={
          error?.message ||
          "There was a problem loading the lesson content. Please try refreshing the page."
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - making it 1/3 of the screen */}
        <div className="w-1/3 bg-slate-900 border-r border-slate-800 p-4 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-200 font-medium">Conversation Map</h2>
            <button className="p-1 rounded hover:bg-slate-800">
              <LayoutGrid size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="h-[calc(100%-40px)]">
            {/* Conversation tree visualization */}
            {visualization && visualization.nodes.length > 0 ? (
              <ConversationFlow
                conversation={conversation.messages}
                onNodeClick={(text, nodeId) => handleNodeClick(nodeId)}
                selectedNodeId={conversation.selectedMessageId}
                nodes={visualization.nodes}
                edges={visualization.edges}
              />
            ) : (
              <div className="p-3 bg-slate-800 rounded-md">
                <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                <div className="mt-2 h-10 bg-slate-700 rounded animate-pulse"></div>
              </div>
            )}
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
                  disabled={isLoadingLesson}
                  className={`p-2 rounded-md transition-all duration-150 ${
                    isLoadingLesson
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-slate-800 active:bg-slate-700"
                  }`}
                >
                  <RefreshCw
                    size={16}
                    className={`text-slate-400 ${isLoadingLesson ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              {isLoadingLesson && displayContent === "" ? (
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
                    tooltips={tooltipItems}
                    tooltipsReady={tooltipsReady}
                    onLearnMore={handleLearnMore}
                  />

                  {!isLoadingLesson && (
                    <SuggestedQuestions
                      questions={questionItems}
                      isLoading={isGeneratingQuestions}
                      isReady={questionsReady}
                      onQuestionClick={handleQuestionClick}
                    />
                  )}
                </div>
              )}

              {isLoadingLesson && displayContent !== "" && (
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
export default React.memo(ChatLayout);
