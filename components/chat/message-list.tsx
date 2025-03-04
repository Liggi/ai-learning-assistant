import React from "react";
import { useChat } from "@/features/chat/chat-context";
import { MessageItem } from "./message-item";
import { AnimatePresence } from "framer-motion";

export const MessageList: React.FC = () => {
  const { currentMessage, tooltips, isLoading } = useChat();

  if (!currentMessage && !isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-slate-400">No message selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <AnimatePresence mode="wait">
        <MessageItem
          message={currentMessage}
          tooltips={tooltips}
          isLoading={isLoading}
        />
      </AnimatePresence>
    </div>
  );
};
