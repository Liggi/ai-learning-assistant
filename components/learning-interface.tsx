import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MarkdownDisplay from "./markdown-display";
import { SuggestedQuestions } from "./suggested-questions";
import PersonalLearningMapFlow from "./personal-learning-map-flow";
import {
  SerializedSubject,
  SerializedArticle,
  SerializedLearningMap,
} from "@/types/serialized";
import { useArticleContent } from "@/hooks/use-article-content";
import { Logger } from "@/lib/logger";
import { useContextualTooltips } from "@/hooks/use-contextual-tooltips";
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { TooltipLoadingIndicator } from "./ui/tooltip-loading-indicator";
import StreamingArticleDisplay from "./streaming-article-display/streaming-article-display";
import { useNavigate } from "@tanstack/react-router";

const logger = new Logger({ context: "LearningInterface", enabled: true });

interface LearningInterfaceProps {
  subject: SerializedSubject;
  learningMap: SerializedLearningMap;
  activeArticle: SerializedArticle | null | undefined;
}

const LearningInterface: React.FC<LearningInterfaceProps> = ({
  subject,
  learningMap,
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
    content: articleContent,
    isStreaming,
    streamComplete,
    contentFinallyReady,
  } = useArticleContent(activeArticle, subject);

  const { tooltips, isGeneratingTooltips, tooltipsReady } =
    useContextualTooltips(
      activeArticle,
      subject,
      articleContent,
      isStreaming,
      streamComplete,
      contentFinallyReady
    );

  const { questions, isGeneratingQuestions, questionsReady } =
    useSuggestedQuestions(
      activeArticle,
      subject,
      isStreaming,
      streamComplete,
      contentFinallyReady
    );

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

  if (!learningMap || !activeArticle) {
    logger.warn(
      "Missing learning map or root article despite no loading/error state",
      { learningMapId: learningMap?.id, rootArticleId: activeArticle?.id }
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
            {/* @TODO: Passing activeArticle as rootArticle is temporary */}
            <PersonalLearningMapFlow
              rootArticle={activeArticle}
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
                  {activeArticle.content ? (
                    // If article already has content, use the regular MarkdownDisplay
                    <MarkdownDisplay
                      content={activeArticle.content}
                      onLearnMore={() => {
                        console.log("Learn more");
                      }}
                      tooltips={tooltips}
                      tooltipsReady={tooltipsReady}
                    />
                  ) : (
                    <StreamingArticleDisplay
                      article={activeArticle}
                      subject={subject}
                    />
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
