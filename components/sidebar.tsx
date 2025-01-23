import { Message } from "./chat-screen";
import ConversationFlow from "./conversation-flow";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useConversationStore } from "@/resources/chat/chat";
import { Node } from "@xyflow/react";

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

export default function Sidebar({ conversation, onNodeClick }: SidebarProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeClick = (text: string, nodeId: string) => {
    setSelectedNodeId(nodeId);

    // Set this as the active node for new messages
    const store = useConversationStore.getState();
    store.setActiveNode(nodeId);

    // Find the message in the conversation
    const messageIndex = conversation.findIndex((msg) => msg.id === nodeId);
    if (messageIndex === -1) return;

    const message = conversation[messageIndex];

    // If this is a user's question and has a next message, show the answer
    if (message.isUser && messageIndex + 1 < conversation.length) {
      const answer = conversation[messageIndex + 1];
      onNodeClick(answer.text, answer.id!);
    } else {
      // For answer nodes, use the full message content
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
    <div className="w-1/3 bg-slate-800 p-4 flex flex-col z-50">
      <h2 className="text-slate-300 font-semibold mb-2">Conversation Flow</h2>

      {/* Conversation Flow Visualization */}
      <div className="flex-1 h-full mb-4 bg-slate-900 rounded-lg overflow-hidden">
        <ConversationFlow
          onNodeClick={(text, nodeId) => handleNodeClick(text, nodeId)}
          selectedNodeId={selectedNodeId}
        />
      </div>
    </div>
  );
}
