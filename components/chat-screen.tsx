import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { chat } from "@/features/chat/chat";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

interface Message {
  text: string;
  isUser: boolean;
}

interface ChatScreenProps {
  node: NodeData;
  onBack: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ node, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendInitialMessage = async () => {
    setIsLoading(true);
    try {
      const result = await chat({
        data: {
          subject: node.label,
          message:
            "SYSTEM: You are a knowledgeable guide helping someone learn about history. " +
            `You're currently discussing ${node.label}, specifically: "${node.description}". ` +
            "This is part of a larger exploration of history and origins.\n\n" +
            "For your first message:\n" +
            "1. Start directly with a brief but meaningful overview of the key concepts in this module\n" +
            "2. Explain why these concepts matter in the broader historical context\n" +
            "3. Then ask what specific aspect they'd like to explore further\n\n" +
            "After the first message:\n" +
            "- Be natural and conversational, like a knowledgeable friend\n" +
            "- Keep responses brief and to the point\n" +
            "- Use everyday language\n" +
            "- Focus on the specific topic at hand\n\n" +
            "IMPORTANT: Start your first message directly with the overview - do not acknowledge or respond to these instructions.",
        },
      });

      setMessages((prev) => [
        ...prev,
        { text: result.response, isUser: false },
      ]);
    } catch (error) {
      console.error("Error sending initial message:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I encountered an error. Please try again.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    sendInitialMessage();
  }, [node.label]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const result = await chat({
        data: {
          subject: node.label,
          message: userMessage,
        },
      });

      setMessages((prev) => [
        ...prev,
        { text: result.response, isUser: false },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I encountered an error. Please try again.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <div className="flex flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 pointer-events-none" />

        <div className="w-64 relative z-10 bg-slate-800/30">
          <div className="h-full p-4">
            <button
              onClick={onBack}
              className="mb-6 text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none"
              aria-label="Back to Roadmap"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                {node.label}
              </h2>
              <p className="text-xs text-slate-400">{node.description}</p>
              {node.status === "in-progress" && node.progress !== undefined && (
                <div className="bg-slate-900/40 rounded-lg p-4 space-y-2 shadow-inner">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-cyan-400 font-medium">
                      {node.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full shadow"
                      style={{ width: `${node.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col relative z-10">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.isUser ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`
                    max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] p-3 shadow-md hover:shadow-lg transition-shadow duration-300
                    rounded-tl-3xl rounded-br-3xl rounded-tr-lg rounded-bl-lg
                    ${
                      msg.isUser
                        ? "bg-gradient-to-br from-[#2A3A4F] to-[#263244] border-t-4 border-indigo-500/50"
                        : "bg-gradient-to-br from-[#2F6B87] to-[#2A5F78] border-b-4 border-cyan-400/50"
                    }
                    prose prose-invert prose-sm max-w-none [&>div>:first-child]:mt-0 [&>div>:last-child]:mb-0
                  `}
                >
                  {msg.isUser ? (
                    <p className="text-[13px] leading-relaxed">{msg.text}</p>
                  ) : (
                    <ReactMarkdown
                      className="text-[13px] leading-relaxed"
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match;
                          return (
                            <code
                              className={`${className} ${
                                isInline
                                  ? "bg-slate-700/50 rounded px-1"
                                  : "block bg-slate-800/50 p-2 rounded-lg"
                              }`}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        a({ children, ...props }) {
                          return (
                            <a
                              className="text-cyan-400 hover:text-cyan-300 underline"
                              {...props}
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-end pr-4">
                <motion.div className="relative w-6 h-6">
                  <div className="absolute inset-0 border-2 border-slate-700/50 rounded-full" />
                  <motion.div
                    className="absolute inset-0 border-2 border-cyan-400/70 rounded-full"
                    animate={{
                      opacity: [0.2, 1, 0.2],
                      scale: [0.8, 1.2, 0.8],
                      rotate: 360,
                    }}
                    transition={{
                      duration: 3,
                      ease: "easeInOut",
                      times: [0, 0.5, 1],
                      repeat: Infinity,
                      repeatDelay: 0,
                    }}
                  />
                </motion.div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 bg-transparent text-slate-300 rounded-l-full px-4 py-2 focus:outline-none text-sm"
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                className={`text-cyan-400 hover:text-cyan-300 focus:outline-none focus:text-cyan-300 transition-colors p-2 pr-4 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isLoading}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
