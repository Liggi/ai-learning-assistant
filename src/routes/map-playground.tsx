import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import LearningMap, { type LearningMapHandle } from "@/components/learning-map";
import ArticleNode from "@/components/learning-map/article-node";
import QuestionNode from "@/components/learning-map/question-node";
import type { ArticleNodeData, QuestionNodeData } from "@/components/learning-map/types";

const nodeTypes = {
  articleNode: ArticleNode,
  questionNode: QuestionNode,
};

const initialNodes = [
  {
    id: "sample-article",
    type: "articleNode",
    position: { x: 250, y: 250 },
    data: {
      id: "sample-article",
      content: {
        summary:
          "Evolution of sausage from ancient preservation technique to diverse culinary tradition.",
        takeaways: [
          "Sausage evolution mirrors human cultural development",
          "Original focus was preservation, now emphasis is on flavor",
          "Basic technique remained constant while ingredients diversified",
          "Modern versions include synthetic casings and meat alternatives",
          "Regional variations reflect local cultural preferences",
        ],
      },
      isUser: false,
    },
  },
];

const initialEdges = [];

function MapPlaygroundPage() {
  const mapRef = useRef<LearningMapHandle>(null);

  const runLayout = () => {
    mapRef.current?.runLayout();
  };

  const handleLayoutComplete = () => {};

  const addQuestionNode = () => {
    const questionData: QuestionNodeData = {
      id: "", // Will be set by addNode
      text: "What preservation methods were used for ancient sausages?",
    };

    mapRef.current?.addNode({
      type: "question",
      data: questionData,
      sourceNodeId: "sample-article",
    });
  };

  const addArticleNode = () => {
    const articleData: ArticleNodeData = {
      id: "", // Will be set by addNode
      content: {
        summary: "Modern sausage production techniques and quality control measures.",
        takeaways: [
          "Industrial sausage production uses automated machinery",
          "Quality control includes temperature monitoring and pH testing",
          "Packaging innovations extend shelf life significantly",
          "Regulatory standards ensure food safety compliance",
        ],
      },
      isUser: false,
    };

    mapRef.current?.addNode({
      type: "article",
      data: articleData,
      sourceNodeId: "sample-article",
    });
  };

  const replaceArticleNode = () => {
    const articleData: ArticleNodeData = {
      id: "sample-article",
      content: {
        summary: "Historical evolution of sausage recipes and preservation techniques.",
        takeaways: [
          "Ancient sausages were often smoked or dried for preservation",
          "Regional spices influenced flavor and shelf life",
          "Fermentation was a common method before refrigeration",
          "Traditional methods are still used in artisanal sausage making",
        ],
      },
      isUser: false,
    };

    mapRef.current?.replaceNode({
      id: "sample-article",
      newNode: {
        id: "sample-article",
        type: "articleNode",
        position: { x: 0, y: 0 },
        data: articleData,
        style: {
          opacity: 1,
          pointerEvents: "auto" as const,
        },
      },
    });
  };

  const showHiddenNodes = () => {
    mapRef.current?.showHiddenNodes();
  };

  return (
    <div className="w-screen h-screen bg-slate-900">
      {/* Toolbar */}
      <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
        <h1 className="text-white font-semibold">Map Playground</h1>
        <div className="flex gap-2">
          <button
            onClick={addQuestionNode}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Add Question
          </button>
          <button
            onClick={addArticleNode}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Add Article
          </button>
          <button
            onClick={runLayout}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Run Layout
          </button>
          <button
            onClick={showHiddenNodes}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Show Hidden
          </button>
          <button
            onClick={replaceArticleNode}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Replace Article
          </button>
        </div>
      </div>

      {/* Map area */}
      <LearningMap
        defaultNodes={initialNodes}
        defaultEdges={initialEdges}
        nodeTypes={nodeTypes}
        onLayoutComplete={handleLayoutComplete}
        ref={mapRef}
        className="h-[calc(100vh-4rem)]"
      />
    </div>
  );
}

export const Route = createFileRoute("/map-playground")({
  component: MapPlaygroundPage,
});
