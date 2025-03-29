import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { SuggestedQuestions } from "./suggested-questions";
import PersonalLearningMapFlow from "./personal-learning-map-flow";
import { SerializedSubject, SerializedArticle } from "@/types/serialized";
import { useGetOrCreateLearningMap } from "@/hooks/api/learning-maps";
import { useRootArticle } from "@/hooks/use-root-article";
import { useArticleContent } from "@/hooks/use-article-content";
import { Logger } from "@/lib/logger";
import { useContextualTooltips } from "@/hooks/use-contextual-tooltips";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { TooltipLoadingIndicator } from "./ui/tooltip-loading-indicator";
import { useNavigate } from "@tanstack/react-router";

const logger = new Logger({ context: "LearningInterface", enabled: true });

interface LearningInterfaceProps {
  subject: SerializedSubject;
  activeArticle: SerializedArticle | null | undefined;
}

const LearningInterface: React.FC<LearningInterfaceProps> = ({
  subject,
  activeArticle,
}) => {
  logger.info("Rendering LearningInterface", {
    subjectId: subject.id,
    activeArticleId: activeArticle?.id,
    timestamp: new Date().toISOString(),
  });

  // Keep track of the current active article ID to detect changes
  const prevArticleIdRef = React.useRef<string | null>(
    activeArticle?.id || null
  );
  React.useEffect(() => {
    // Check if the article ID has changed
    if (activeArticle?.id && prevArticleIdRef.current !== activeArticle.id) {
      logger.info("Article ID changed in LearningInterface", {
        prevArticleId: prevArticleIdRef.current,
        newArticleId: activeArticle.id,
      });
      prevArticleIdRef.current = activeArticle.id;
    }
  }, [activeArticle?.id]);

  const [isMapExpanded, setIsMapExpanded] = React.useState(false);
  const navigate = useNavigate();

  const {
    data: learningMap,
    isLoading: isLoadingMap,
    error: mapError,
  } = useGetOrCreateLearningMap(subject.id);

  const {
    article: rootArticle,
    isLoading: isLoadingRootArticle,
    error: rootArticleError,
  } = useRootArticle(learningMap);

  const {
    content: articleContent,
    isStreaming,
    streamComplete,
    hasExistingContent,
  } = useArticleContent(activeArticle, subject);

  const { tooltips, isGeneratingTooltips, tooltipsReady } =
    useContextualTooltips(
      activeArticle,
      subject,
      articleContent,
      isStreaming,
      streamComplete
    );

  const { questions, isGeneratingQuestions, questionsReady } =
    useSuggestedQuestions(activeArticle, subject, isStreaming, streamComplete);

  const toggleLayout = () => {
    setIsMapExpanded((prev) => !prev);
  };

  const handleNodeClick = (nodeId: string) => {
    logger.info("Node clicked, navigating to article view", { nodeId });
    navigate({
      to: "/learning/article/$articleId",
      params: { articleId: nodeId },
    });
  };

  const handleArticleCreated = (newArticleId: string) => {
    logger.info(
      "New article created from question, navigating to article view",
      { newArticleId, currentArticleId: activeArticle?.id }
    );
    // Update our local reference to avoid any inconsistency
    prevArticleIdRef.current = newArticleId;

    // Use replace to avoid back button issues
    navigate({
      to: "/learning/article/$articleId",
      params: { articleId: newArticleId },
      replace: true,
    });
  };

  const isLoadingInitialData = isLoadingMap || isLoadingRootArticle;
  const overallError = mapError || rootArticleError;

  if (overallError) {
    logger.error("Error in LearningInterface data fetching", {
      error: overallError,
    });
    return <div>Error: {overallError.message}</div>;
  }

  if (isLoadingInitialData && !learningMap) {
    return <div>Loading Learning Map...</div>;
  }

  if (!rootArticle && learningMap && isLoadingRootArticle) {
    return <div>Initializing Root Article...</div>;
  }

  if (!learningMap || !rootArticle) {
    logger.warn(
      "Missing learning map or root article despite no loading/error state",
      { learningMapId: learningMap?.id, rootArticleId: rootArticle?.id }
    );
    return <div>Error initializing the learning interface.</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`${isMapExpanded ? "w-2/3" : "w-1/3"} bg-slate-900 border-r border-slate-800 hidden md:block transition-all duration-300`}
        >
          <div className="h-full">
            <PersonalLearningMapFlow
              rootArticle={rootArticle}
              onNodeClick={handleNodeClick}
              learningMap={learningMap}
            />
          </div>
        </div>

        <div
          className={`absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${
            isMapExpanded ? "left-2/3 -ml-3" : "left-1/3 -ml-3"
          }`}
        >
          <button
            onClick={toggleLayout}
            className="bg-slate-800 hover:bg-slate-700 rounded-full p-1.5 shadow-md"
            aria-label={isMapExpanded ? "Expand content" : "Expand map"}
          >
            {isMapExpanded ? (
              <ChevronLeft size={16} className="text-slate-300" />
            ) : (
              <ChevronRight size={16} className="text-slate-300" />
            )}
          </button>
        </div>

        <div
          className={`${isMapExpanded ? "w-1/3" : "w-2/3"} flex-1 flex flex-col overflow-hidden bg-slate-950 transition-all duration-300`}
        >
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="absolute top-4 right-4 z-10">
              <TooltipLoadingIndicator isLoading={isGeneratingTooltips} />
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeArticle ? (
                <>
                  <MarkdownDisplay
                    content={articleContent || ""}
                    onLearnMore={() => {
                      console.log("Learn more");
                    }}
                    tooltips={tooltips}
                    tooltipsReady={tooltipsReady}
                  />
                  {isStreaming && (
                    <div className="mt-4 flex items-center justify-center text-slate-400">
                      <div className="flex items-center space-x-1">
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                        <span className="animate-bounce delay-300">.</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>Select an article or topic on the map to learn more.</div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 p-4">
            {activeArticle ? (
              <SuggestedQuestions
                learningMapId={learningMap.id}
                currentArticleId={activeArticle.id}
                questions={questions}
                onQuestionClick={(question) => {
                  logger.info("Question clicked (noop)", { question });
                }}
                onArticleCreated={handleArticleCreated}
                isLoading={isGeneratingQuestions}
                isReady={questionsReady}
              />
            ) : (
              <div className="text-slate-500">
                Select an article to see suggested questions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningInterface;
