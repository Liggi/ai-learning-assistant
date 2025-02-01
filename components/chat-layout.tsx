import React, { useState } from "react";
import ConversationFlow from "./conversation-flow";
import ChatInterface from "./chat-interface";
import { useConversationStore } from "@/features/chat/store";

interface ChatLayoutProps {
  node: {
    label: string;
    description: string;
    status?: "not-started" | "in-progress" | "completed";
    progress?: number;
  };
  subject: string;
  onBack: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ node, subject, onBack }) => {
  const [selectedMessageId, setSelectedMessageId] = useState<
    string | undefined
  >();
  const conversation = useConversationStore((state) => state.messages);

  // Hook up the conversation flow callback so that clicking a node updates
  // the selected message
  const handleNodeClick = (text: string, nodeId: string) => {
    setSelectedMessageId(nodeId);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      {/* Left: Conversation Flow Visualization */}
      <div className="w-1/2 h-full border-r border-slate-700">
        <ConversationFlow
          conversation={conversation}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedMessageId}
        />
      </div>
      {/* Right: Chat Interface */}
      <div className="w-1/2 h-full">
        <ChatInterface
          node={node}
          subject={subject}
          onBack={onBack}
          selectedMessageId={selectedMessageId}
        />
      </div>
    </div>
  );
};

export default ChatLayout;
