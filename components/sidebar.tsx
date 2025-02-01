import ConversationFlow from "./conversation-flow";
import { useState } from "react";
import { useConversationStore, Message } from "@/features/chat/store";
import { Node, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { LayoutGrid, GitBranch } from "lucide-react";
import RoadmapNode from "@/components/react-flow/node";

interface NodeData {
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

interface ConversationNodeData extends Record<string, unknown> {
  id: string;
  text: string;
  summary: string;
  isUser: boolean;
}

interface SidebarProps {
  conversation: Message[];
  onNodeClick: (text: string, nodeId: string) => void;
}

const nodeTypes = { normalNode: RoadmapNode };

function isConversationNode(node: Node): node is Node<ConversationNodeData> {
  return (
    node.data &&
    typeof node.data === "object" &&
    "id" in node.data &&
    "text" in node.data &&
    "summary" in node.data &&
    "isUser" in node.data
  );
}

function isNodeData(data: unknown): data is NodeData {
  return (
    typeof data === "object" &&
    data !== null &&
    "label" in data &&
    "description" in data &&
    typeof (data as NodeData).label === "string" &&
    typeof (data as NodeData).description === "string"
  );
}

export default function Sidebar({ conversation, onNodeClick }: SidebarProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [view, setView] = useState<"conversation" | "roadmap">("conversation");
  const store = useConversationStore.getState();
  console.log("Conversation store state:", {
    nodes: store.nodes,
    edges: store.edges,
    conversation,
  });

  const handleNodeClick = (text: string, nodeId: string) => {
    setSelectedNodeId(nodeId);
    store.setActiveNode(nodeId);

    const messageIndex = conversation.findIndex((msg) => msg.id === nodeId);
    if (messageIndex === -1) return;

    const message = conversation[messageIndex];

    if (message.isUser && messageIndex + 1 < conversation.length) {
      const answer = conversation[messageIndex + 1];
      onNodeClick(answer.text, answer.id!);
    } else {
      onNodeClick(message.text, message.id!);
    }
  };

  const handleFlowNodeClick = (nodeId: string) => {
    const store = useConversationStore.getState();
    const node = store.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Set this as the active node for new messages
    store.setActiveNode(nodeId);

    // Rest of existing click handler...
  };

  return (
    <div className="w-1/2 border-r border-slate-800 flex flex-col h-screen">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <button
          onClick={() =>
            setView(view === "conversation" ? "roadmap" : "conversation")
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-md
                   text-sm font-medium transition-all duration-150
                   bg-slate-800/50 border border-slate-700/50
                   hover:bg-slate-800 hover:border-slate-700"
        >
          {view === "conversation" ? (
            <>
              <LayoutGrid size={14} className="text-slate-400" />
              <span className="text-slate-300">View Roadmap</span>
            </>
          ) : (
            <>
              <GitBranch size={14} className="text-slate-400" />
              <span className="text-slate-300">View Conversation</span>
            </>
          )}
        </button>
      </div>

      {/* View Content */}
      <div className="flex-1 bg-slate-900">
        {view === "conversation" ? (
          <ConversationFlow
            conversation={conversation}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
          />
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              nodes={store.nodes}
              edges={store.edges}
              onNodeClick={(_, node) => {
                if (isNodeData(node.data)) {
                  onNodeClick(node.data.label, node.id);
                }
              }}
              nodeTypes={nodeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              minZoom={0.5}
              maxZoom={1.2}
            />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
