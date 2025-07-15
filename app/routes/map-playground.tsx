import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import LearningMap from "@/components/learning-map";
import ArticleNode from "@/components/learning-map/article-node";
import QuestionNode from "@/components/learning-map/question-node";
import type { QuestionNodeData } from "@/components/learning-map/types";

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
        summary: "Evolution of sausage from ancient preservation technique to diverse culinary tradition.",
        takeaways: [
          "Sausage evolution mirrors human cultural development",
          "Original focus was preservation, now emphasis is on flavor",
          "Basic technique remained constant while ingredients diversified",
          "Modern versions include synthetic casings and meat alternatives",
          "Regional variations reflect local cultural preferences"
        ],
      },
      isUser: false,
    },
  },
];

const initialEdges = [];

function MapPlaygroundPage() {
  const mapRef = useRef<{ 
    runLayout: () => void; 
    addQuestionNode: (questionData: QuestionNodeData, sourceNodeId?: string) => void;
    showHiddenNodes: () => void;
  }>(null);

  const runLayout = () => {
    mapRef.current?.runLayout();
  };

  const handleLayoutComplete = () => {
    console.log('Layout completed!');
  };

  const addQuestionNode = () => {
    const questionData: QuestionNodeData = {
      id: '', // Will be set by addQuestionNode
      text: "What preservation methods were used for ancient sausages?",
    };
    
    mapRef.current?.addQuestionNode(questionData, "sample-article");
  };

  const showHiddenNodes = () => {
    mapRef.current?.showHiddenNodes();
  };

  // Count hidden nodes by checking the ref (this is a bit hacky but works for demo)
  const hiddenNodeCount = 1; // We'll simplify this for now since we don't have direct access to the internal state

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
            Add Question (Hidden)
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