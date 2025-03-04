import React, { useEffect } from "react";
import {
  ChatProvider,
  useChat,
  useChatInitialization,
} from "@/features/chat/chat-context";
import { MessageList } from "./message-list";
import { InputArea } from "./input-area";
import { useConversationStore } from "@/features/chat/store";
import { NodeData } from "@/features/chat/chat-service";

interface ChatInterfaceProps {
  subject: string;
  node?: NodeData;
  onBack: () => void;
  selectedMessageId?: string;
  onNewMessage?: (messageId: string) => void;
}

// Inner component that uses the chat context
const ChatInterfaceInner: React.FC<{
  node?: NodeData;
  selectedMessageId?: string;
}> = ({ node, selectedMessageId }) => {
  const { hasInitialized } = useChatInitialization(node, selectedMessageId);

  if (!node) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-slate-800">
        <h2 className="text-lg font-medium text-slate-200">{node?.label}</h2>
        <p className="text-sm text-slate-400/80 mt-1">{node?.description}</p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-auto">
        <MessageList />
        <InputArea />
      </div>
    </div>
  );
};

// Wrapper component that provides the context
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  subject,
  node,
  onBack,
  selectedMessageId,
  onNewMessage,
}) => {
  return (
    <ChatProvider
      subject={subject}
      nodeTitle={node?.label}
      nodeDescription={node?.description}
      onNewMessage={onNewMessage}
    >
      <ChatInterfaceInner node={node} selectedMessageId={selectedMessageId} />
    </ChatProvider>
  );
};
