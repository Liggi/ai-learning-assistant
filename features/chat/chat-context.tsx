import React, { createContext, useContext, useState } from "react";
import { useConversationStore } from "./store";
import { chatService, Message, NodeData } from "./chat-service";

interface ChatContextValue {
  isLoading: boolean;
  tooltips: Record<string, string>;
  suggestions: string[];
  isSuggestionsLoading: boolean;
  currentMessage: Message | null;
  sendMessage: (message: string) => Promise<void>;
  sendInitialMessage: () => Promise<void>;
  selectMessage: (messageId: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider: React.FC<{
  children: React.ReactNode;
  subject: string;
  nodeTitle?: string;
  nodeDescription?: string;
  onNewMessage?: (messageId: string) => void;
}> = ({ children, subject, nodeTitle, nodeDescription, onNewMessage }) => {
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [tooltips, setTooltips] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);

  // Store access
  const addMessage = useConversationStore((state) => state.addMessage);
  const setActiveNode = useConversationStore((state) => state.setActiveNode);
  const activeNodeId = useConversationStore((state) => state.activeNodeId);
  const messages = useConversationStore((state) => state.messages);

  // Functions
  const sendMessage = async (message: string) => {
    if (!nodeTitle || !nodeDescription) return;

    setIsLoading(true);

    try {
      const result = await chatService.sendMessage({
        message,
        subject,
        moduleTitle: nodeTitle,
        moduleDescription: nodeDescription,
        parentId: activeNodeId || undefined,
      });

      // Update state
      addMessage(result.userMessage);
      addMessage(result.assistantMessage);
      setCurrentMessage(result.assistantMessage);
      setActiveNode(result.assistantMessage.id || "");
      setTooltips((prev) => ({ ...prev, ...result.tooltips }));
      onNewMessage?.(result.assistantMessage.id || "");

      // Generate suggestions
      generateSuggestions(result.assistantMessage.text);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInitialMessage = async () => {
    if (!nodeTitle || !nodeDescription) return;

    setIsLoading(true);

    try {
      const result = await chatService.sendInitialMessage({
        subject,
        moduleTitle: nodeTitle,
        moduleDescription: nodeDescription,
      });

      // Update state
      addMessage(result.assistantMessage);
      setCurrentMessage(result.assistantMessage);
      setActiveNode(result.assistantMessage.id || "");
      setTooltips((prev) => ({ ...prev, ...result.tooltips }));
      onNewMessage?.(result.assistantMessage.id || "");

      // Generate suggestions
      generateSuggestions(result.assistantMessage.text);
    } catch (error) {
      console.error("Error sending initial message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectMessage = (messageId: string) => {
    // Find message and set as current
    const message = messages.find((msg) => msg.id === messageId);

    if (message) {
      setCurrentMessage(message);
      setActiveNode(messageId);
      generateSuggestions(message.text);
    }
  };

  const generateSuggestions = async (text: string) => {
    if (!text || !nodeTitle || !nodeDescription) return;

    setIsSuggestionsLoading(true);
    setSuggestions([]);

    try {
      const result = await chatService.generateSuggestions({
        text,
        subject,
        moduleTitle: nodeTitle,
        moduleDescription: nodeDescription,
      });

      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isLoading,
        tooltips,
        suggestions,
        isSuggestionsLoading,
        currentMessage,
        sendMessage,
        sendInitialMessage,
        selectMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const useChatInitialization = (
  node: NodeData | undefined,
  selectedMessageId?: string
) => {
  const { selectMessage, sendInitialMessage } = useChat();
  const messages = useConversationStore((state) => state.messages);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Effect to handle selected message updates
  React.useEffect(() => {
    if (!selectedMessageId) return;

    const message = messages.find((msg) => msg.id === selectedMessageId);
    if (message) {
      selectMessage(message.id || "");
    }
  }, [selectedMessageId, messages, selectMessage]);

  // Effect to reset initialization on node change
  React.useEffect(() => {
    if (node?.id) {
      setHasInitialized(false);
    }
  }, [node?.id]);

  // Effect to handle initial message
  React.useEffect(() => {
    if (!hasInitialized && node?.label) {
      setHasInitialized(true);
      sendInitialMessage();
    }
  }, [hasInitialized, node?.label, sendInitialMessage]);

  return {
    hasInitialized,
    setHasInitialized,
  };
};
