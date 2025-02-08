import React, { useState } from "react";
import ConversationFlow from "./conversation-flow";
import ChatInterface from "./chat-interface";
import { useConversationStore } from "@/features/chat/store";
import { useRoadmapStore, RoadmapNodeData } from "@/features/roadmap/store";
import RoadmapView from "@/components/roadmap-view";
import { Node } from "@xyflow/react";
import { LayoutGrid, GitBranch } from "lucide-react";

export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
  type: "roadmap";
}

interface ChatLayoutProps {
  node?: RoadmapNodeData;
  onBack: () => void;
  subject: string;
  selectedMessageId?: string;
  onShowRoadmap?: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  node,
  subject,
  onBack,
  selectedMessageId: selectedMessageIdProp,
  onShowRoadmap,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<
    string | undefined
  >(selectedMessageIdProp);
  const [currentView, setCurrentView] = useState<"conversation" | "roadmap">(
    "conversation"
  );

  // Get conversation data
  const {
    messages: conversation,
    nodes: conversationNodes,
    edges: conversationEdges,
    setActiveNode,
  } = useConversationStore((state) => ({
    messages: state.messages,
    nodes: state.nodes,
    edges: state.edges,
    setActiveNode: state.setActiveNode,
  }));

  // Get roadmap data
  const { nodes: roadmapNodes, edges: roadmapEdges } = useRoadmapStore(
    (state) => ({
      nodes: state.nodes,
      edges: state.edges,
    })
  );

  // Hook up the conversation flow callback so that clicking a node updates
  // the selected message
  const handleNodeClick = (text: string, nodeId: string) => {
    // Find the clicked message
    const messageIndex = conversation.findIndex((msg) => msg.id === nodeId);
    if (messageIndex === -1) return;

    const message = conversation[messageIndex];

    // If this is a user message (question) and there's a next message, select the answer instead
    if (message.isUser && messageIndex + 1 < conversation.length) {
      const answer = conversation[messageIndex + 1];
      if (answer.id) {
        setSelectedMessageId(answer.id);
        setActiveNode(answer.id);
      }
    } else if (message.id) {
      setSelectedMessageId(message.id);
      setActiveNode(message.id);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      {/* Left: Conversation Flow or Roadmap Visualization */}
      <div className="w-1/2 h-full border-r border-slate-700 relative">
        {/* View Toggle Button */}
        <button
          onClick={() =>
            setCurrentView(
              currentView === "conversation" ? "roadmap" : "conversation"
            )
          }
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md
                   text-xs font-medium transition-all duration-150
                   bg-slate-800/50 border border-slate-700/50
                   hover:bg-slate-800 hover:border-slate-700"
        >
          {currentView === "conversation" ? (
            <>
              <LayoutGrid size={12} className="text-slate-400" />
              <span className="text-slate-300">Learning Plan</span>
            </>
          ) : (
            <>
              <GitBranch size={12} className="text-slate-400" />
              <span className="text-slate-300">Conversation Map</span>
            </>
          )}
        </button>

        {currentView === "conversation" ? (
          <ConversationFlow
            conversation={conversation}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedMessageId || selectedMessageIdProp}
          />
        ) : (
          <RoadmapView
            nodes={roadmapNodes}
            edges={roadmapEdges}
            onNodeClick={(node) => {
              // If we have a parent onShowRoadmap, use that for full-screen mode
              if (onShowRoadmap) {
                onShowRoadmap();
              } else {
                // Otherwise, switch back to conversation view with the selected node
                setCurrentView("conversation");
                handleNodeClick(node.data.label, node.id);
              }
            }}
            onReset={() => setCurrentView("conversation")}
            isPanel={true}
          />
        )}
      </div>
      {/* Right: Chat Interface */}
      <div className="w-1/2 h-full">
        <ChatInterface
          node={node}
          subject={subject}
          onBack={onBack}
          selectedMessageId={selectedMessageId || selectedMessageIdProp}
          onNewMessage={(messageId) => setSelectedMessageId(messageId)}
        />
      </div>
    </div>
  );
};

export default ChatLayout;
