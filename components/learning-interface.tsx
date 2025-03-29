import React, { useState, useEffect } from "react";
import { LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useArticle } from "@/hooks/api/articles";
import { serializeArticle } from "@/types/serializers";

const logger = new Logger({ context: "LearningInterface", enabled: true });

interface LearningInterfaceProps {
  subject: SerializedSubject;
}

const LearningInterface: React.FC<LearningInterfaceProps> = ({ subject }) => {
  logger.info("Rendering LearningInterface", { subjectId: subject.id });

  const [isMapExpanded, setIsMapExpanded] = React.useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);

  const toggleLayout = () => {
    setIsMapExpanded((prev) => !prev);
  };

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

  useEffect(() => {
    if (rootArticle && !currentArticleId) {
      setCurrentArticleId(rootArticle.id);
    }
  }, [rootArticle, currentArticleId]);

  const { data: fetchedArticle, isLoading: isLoadingCurrentArticle } =
    useArticle(
      currentArticleId && currentArticleId !== rootArticle?.id
        ? currentArticleId
        : null
    );

  const activeArticle = fetchedArticle
    ? learningMap?.articles?.find((a) => a.id === fetchedArticle.id) ||
      rootArticle
    : rootArticle;

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

  logger.info("Learning Map", {
    learningMap,
  });

  logger.info("Current Article", {
    currentArticleId,
    activeArticle,
  });

  const handleNodeClick = (nodeId: string) => {
    logger.info("Node clicked", { nodeId });

    const articleId = nodeId.startsWith("article-")
      ? nodeId.replace("article-", "")
      : nodeId;

    setCurrentArticleId(articleId);
  };

  const handleArticleCreated = (newArticleId: string) => {
    logger.info("New article created from question", { newArticleId });
    setCurrentArticleId(newArticleId);
  };

  const isLoading =
    isLoadingMap || isLoadingRootArticle || isLoadingCurrentArticle;
  const error = mapError || rootArticleError;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    logger.error("Error in LearningInterface", { error });
    return <div>Error: {error.message}</div>;
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
            </div>
          </div>

          <div className="border-t border-slate-800 p-4">
            {learningMap && activeArticle && (
              <SuggestedQuestions
                learningMapId={learningMap.id}
                currentArticleId={activeArticle.id}
                questions={questions}
                onQuestionClick={(question) => {
                  logger.info("Question clicked", { question });
                }}
                onArticleCreated={handleArticleCreated}
                isLoading={isGeneratingQuestions}
                isReady={questionsReady}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningInterface;
