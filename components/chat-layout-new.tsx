import React from "react";
import { LayoutGrid, RefreshCw } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { ErrorDisplay } from "./error-display";
import { SuggestedQuestions } from "./suggested-questions";
import PersonalLearningMapFlow from "./personal-learning-map-flow";
import {
  useLearningContext,
  LearningContextProvider,
} from "@/hooks/context/learning-context";

// Sample data for the learning map visualization
const SAMPLE_NODES = [
  {
    id: "1",
    type: "articleNode",
    data: { label: "Introduction to React" },
    position: { x: 250, y: 100 },
  },
  {
    id: "2",
    type: "articleNode",
    data: { label: "Components and Props" },
    position: { x: 100, y: 200 },
  },
  {
    id: "3",
    type: "articleNode",
    data: { label: "State and Lifecycle" },
    position: { x: 400, y: 200 },
  },
];

const SAMPLE_EDGES = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e1-3", source: "1", target: "3" },
];

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

const ChatLayoutContent: React.FC<ChatLayoutProps> = ({ moduleDetails }) => {
  const { state, dispatch } = useLearningContext();

  const handleQuestionClick = (question: string) => {
    console.log("Question clicked:", question);
  };

  const handleLearnMore = (concept: string) => {
    console.log("Learn more about:", concept);
  };

  const handleRefresh = () => {
    dispatch({ type: "RESET" });
  };

  const handleNodeClick = (nodeId: string) => {
    console.log("Node clicked:", nodeId);
  };

  // Determine loading state based on the state machine
  const isLoading =
    state.status === "IDLE" || state.status === "INITIALISING_LEARNING_MAP";
  const displayContent = state.articleContent;

  // Show error if there is one
  if (state.error) {
    return <ErrorDisplay title="Error Loading Lesson" message={state.error} />;
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/3 bg-slate-900 border-r border-slate-800 p-4 hidden md:block">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-200 font-medium">Learning Map</h2>
            <button className="p-1 rounded hover:bg-slate-800">
              <LayoutGrid size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="h-[calc(100%-40px)]">
            {!isLoading ? (
              <PersonalLearningMapFlow
                nodes={SAMPLE_NODES}
                edges={SAMPLE_EDGES}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <div className="p-3 bg-slate-800 rounded-md">
                <div className="h-4 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                <div className="mt-2 h-10 bg-slate-700 rounded animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h1 className="text-xl font-semibold text-slate-200">
                {moduleDetails.moduleTitle}
              </h1>
              <button
                onClick={handleRefresh}
                className="p-2 rounded hover:bg-slate-800"
              >
                <RefreshCw size={16} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
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
                <>
                  {state.personalLearningMapId && (
                    <div className="mb-4 p-2 bg-slate-800 rounded text-sm text-slate-300">
                      Learning Map ID: {state.personalLearningMapId}
                    </div>
                  )}
                  {displayContent ? (
                    <MarkdownDisplay
                      content={displayContent}
                      onLearnMore={handleLearnMore}
                    />
                  ) : (
                    <div className="text-slate-400">
                      No content available yet.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 p-4">
            <SuggestedQuestions
              questions={[
                "What are React components?",
                "How does state work in React?",
                "What are props used for?",
              ]}
              onQuestionClick={handleQuestionClick}
              isLoading={false}
              isReady={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatLayout: React.FC<ChatLayoutProps> = (props) => {
  const { subjectId, moduleId } = props;

  return (
    <LearningContextProvider subjectId={subjectId} moduleId={moduleId}>
      <ChatLayoutContent {...props} />
    </LearningContextProvider>
  );
};

export default ChatLayout;
