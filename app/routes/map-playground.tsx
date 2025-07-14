import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import LearningMap from "@/components/learning-map";
import ArticleNode from "@/components/learning-map/article-node";
import QuestionNode from "@/components/learning-map/question-node";

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
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const addQuestionNode = () => {
    const questionId = `question-${Date.now()}`;
    const articleNode = nodes.find(n => n.id === "sample-article");
    
    if (!articleNode) return;

    const newQuestionNode = {
      id: questionId,
      type: "questionNode",
      position: { 
        x: articleNode.position.x + 200, 
        y: articleNode.position.y + 100 
      },
      data: {
        id: questionId,
        text: "What preservation methods were used for ancient sausages?",
      },
    };

    const newEdge = {
      id: `${articleNode.id}-${questionId}`,
      source: articleNode.id,
      target: questionId,
      type: "smoothstep",
      animated: true,
    };

    setNodes(prev => [...prev, newQuestionNode]);
    setEdges(prev => [...prev, newEdge]);
  };

  return (
    <div className="w-screen h-screen bg-slate-900">
      {/* Toolbar */}
      <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
        <h1 className="text-white font-semibold">Map Playground</h1>
        <button
          onClick={addQuestionNode}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Add Question
        </button>
      </div>
      
      {/* Map area */}
      <LearningMap
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        className="h-[calc(100vh-4rem)]"
      />
    </div>
  );
}

export const Route = createFileRoute("/map-playground")({
  component: MapPlaygroundPage,
});