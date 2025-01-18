import React, { useState, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { chat } from "@/features/chat/chat";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingBubble } from "./ui/loading-bubble";

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
  subject: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ node, onBack, subject }) => {
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendInitialMessage = async () => {
    setIsLoading(true);
    try {
      const result = await chat({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message: "Let's begin our lesson.",
        },
      });

      setCurrentMessage({ text: result.response, isUser: false });
    } catch (error) {
      console.error("Error sending initial message:", error);
      setCurrentMessage({
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
      });
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
    setIsLoading(true);

    try {
      const result = await chat({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message: userMessage,
        },
      });

      setCurrentMessage({ text: result.response, isUser: false });
    } catch (error) {
      console.error("Error:", error);
      setCurrentMessage({
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <div className="flex flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800" />

        <div className="relative z-10 flex flex-1">
          <button
            onClick={onBack}
            className="absolute top-4 left-4 text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none"
            aria-label="Back to Roadmap"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-card rounded-lg shadow-lg p-8 max-w-4xl w-full max-h-[85vh] flex flex-col">
              <div className="mb-6 flex-shrink-0">
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  {node.label}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {node.description}
                </p>
              </div>

              <div className="mb-6 overflow-y-auto flex-1 bg-slate-800/50 rounded-lg p-6 shadow-inner">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center"
                    >
                      <LoadingBubble />
                    </motion.div>
                  ) : currentMessage ? (
                    <motion.div
                      key="message"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                        transition: {
                          height: {
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6,
                          },
                        },
                      }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-[60vh] overflow-y-auto">
                        <ReactMarkdown
                          className="prose prose-invert prose-sm max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0"
                          components={{
                            h2: ({ children }) => (
                              <h2 className="text-lg font-bold text-white mt-6 mb-4">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-semibold text-white mt-5 mb-3">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-slate-200 leading-relaxed mb-4 text-[15px]">
                                {children}
                              </p>
                            ),
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(
                                className || ""
                              );
                              const isInline = !match;
                              return (
                                <code
                                  className={`${className} ${
                                    isInline
                                      ? "bg-slate-700/50 rounded px-1 py-0.5 text-[13px]"
                                      : "block bg-slate-800 p-3 rounded-lg my-3 text-[13px] leading-relaxed"
                                  }`}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            ol: ({ children }) => (
                              <ol className="list-decimal list-inside space-y-2 mb-4">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-slate-200 text-[15px]">
                                {children}
                              </li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-white">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {currentMessage.text}
                        </ReactMarkdown>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700 flex-shrink-0">
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
    </div>
  );
};

export default ChatScreen;
