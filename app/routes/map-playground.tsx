import { createFileRoute } from "@tanstack/react-router";
import { ReactFlow, ReactFlowProvider, Background } from "@xyflow/react";
import ArticleNode from "@/components/learning-map/article-node";
import "@xyflow/react/dist/style.css";

const nodeTypes = {
  articleNode: ArticleNode,
};

const nodes = [
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

const edges = [];

function MapPlaygroundPage() {
  return (
    <div className="w-screen h-screen bg-slate-900">
      {/* Reserve space for future toolbar */}
      <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-white font-semibold">Map Playground</h1>
      </div>
      
      {/* Map area */}
      <div className="h-[calc(100vh-4rem)]">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#f0f0f0" gap={24} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/map-playground")({
  component: MapPlaygroundPage,
});