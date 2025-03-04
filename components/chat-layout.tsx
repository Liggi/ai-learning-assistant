import React, { useState, useEffect } from "react";
import ConversationFlow from "./conversation-flow";
import { ChatInterface } from "./chat/chat-interface";
import { useConversationStore } from "@/features/chat/store";
import RoadmapView from "@/components/roadmap-view";
import { LayoutGrid } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import type { RoadmapNodeData } from "@/types/roadmap";

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
  roadmapNodes?: Node[];
  roadmapEdges?: Edge[];
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  node,
  subject,
  onBack,
  selectedMessageId: selectedMessageIdProp,
  onShowRoadmap,
  roadmapNodes = [],
  roadmapEdges = [],
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<
    string | undefined
  >(selectedMessageIdProp);
  const [currentView, setCurrentView] = useState<"conversation" | "roadmap">(
    "conversation"
  );

  const messages = useConversationStore((state) => state.messages);
  const setActiveNode = useConversationStore((state) => state.setActiveNode);
  const currentMessage = useConversationStore((state) => {
    const activeNodeId = state.activeNodeId;
    return activeNodeId
      ? state.messages.find((msg) => msg.id === activeNodeId)
      : undefined;
  });

  const handleNodeClick = (text: string, nodeId: string) => {
    const messageIndex = messages.findIndex((msg) => msg.id === nodeId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];

    // If this is a user message (question) and there's a next message, select the answer instead
    if (message.isUser && messageIndex + 1 < messages.length) {
      const answer = messages[messageIndex + 1];
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
        <button
          onClick={() => {
            if (onShowRoadmap) {
              onShowRoadmap();
            }
          }}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md
                   text-xs font-medium transition-all duration-150
                   bg-slate-800/50 border border-slate-700/50
                   hover:bg-slate-800 hover:border-slate-700"
        >
          <LayoutGrid size={12} className="text-slate-400" />
          <span className="text-slate-300">Learning Plan</span>
        </button>

        {currentView === "conversation" ? (
          <ConversationFlow
            conversation={messages}
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
