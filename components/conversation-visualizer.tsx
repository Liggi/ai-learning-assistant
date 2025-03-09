import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
} from "@xyflow/react";
import ConversationNode from "./conversation-node";
import { useConversationOrchestrator } from "@/hooks/orchestration/use-conversation-orchestrator";
import "@xyflow/react/dist/style.css";
import { useState } from "react";
import { Button } from "./ui/button";
import { LayoutGrid, MessageSquare, RefreshCcw } from "lucide-react";

// Node types for ReactFlow
const nodeTypes = {
  conversationNode: ConversationNode,
};

// Default edge options
const defaultEdgeOptions = {
  style: {
    stroke: "rgba(148, 163, 184, 0.4)",
    strokeWidth: 1.5,
    strokeDasharray: "4 4",
  },
  animated: true,
  type: "smoothstep",
};

interface ConversationVisualizerProps {
  subjectId: string;
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
}

export default function ConversationVisualizer({
  subjectId,
  moduleId,
  moduleTitle,
  moduleDescription,
}: ConversationVisualizerProps) {
  const [activeView, setActiveView] = useState<"map" | "chat">("chat");

  // Use our orchestrator to manage the conversation and visualization
  const orchestrator = useConversationOrchestrator(
    subjectId,
    moduleId,
    moduleTitle,
    moduleDescription
  );

  const { conversation, visualization, handleNodeClick, handleRefresh } =
    orchestrator;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-slate-700 p-3 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={activeView === "chat" ? "default" : "outline"}
              onClick={() => setActiveView("chat")}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </Button>
            <Button
              size="sm"
              variant={activeView === "map" ? "default" : "outline"}
              onClick={() => setActiveView("map")}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Visualization</span>
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRefresh()}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-hidden">
        {activeView === "chat" ? (
          <div className="p-4 h-full overflow-y-auto">
            {/* Chat messages would be rendered here */}
            <div className="space-y-4">
              {conversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.isUser
                      ? "bg-blue-900/20 border border-blue-800/30"
                      : "bg-green-900/20 border border-green-800/30"
                  }`}
                >
                  <div className="text-xs font-medium mb-2">
                    {message.isUser ? "You" : "Assistant"}
                  </div>
                  <div className="text-sm">{message.text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <ReactFlowProvider>
              <ReactFlow
                nodes={visualization.nodes.map((node) => ({
                  ...node,
                  selected: node.id === conversation.selectedMessageId,
                  data: {
                    ...node.data,
                    onClick: () => handleNodeClick(node.id),
                  },
                }))}
                edges={visualization.edges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 0.4 }}
                nodesDraggable={false}
                nodesConnectable={false}
                minZoom={0.2}
                maxZoom={2}
                zoomOnScroll={true}
              >
                <Background color="#4a5568" gap={16} />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        )}
      </div>
    </div>
  );
}
