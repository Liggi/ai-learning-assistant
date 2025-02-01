import React, { useState, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { chat, generateSuggestionPills } from "@/features/chat/chat";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { LoadingBubble } from "./ui/loading-bubble";
import { useConversationStore } from "@/features/chat/store";

export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

interface Message {
  text: string;
  isUser: boolean;
  id?: string;
  parentId?: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
}

interface ChatInterfaceProps {
  node?: NodeData;
  onBack: () => void;
  subject: string;
  selectedMessageId?: string;
}

const generateLearningPrompt = (text: string) => {
  return `Please take the following text about ${text} and produce the following:

A concise, one-or-two-sentence high-level summary capturing the essential idea.
Several short statements or 'takeaways' highlighting the main points, each on its own line.
Keep it factual, clear, and succinct. Avoid unnecessary details or overly friendly tone. Focus on the key concepts.

Return the response in this exact JSON format:
{
  "summary": "The high level summary goes here",
  "takeaways": [
    "First takeaway",
    "Second takeaway",
    "etc..."
  ]
}

Here's the text to analyze:

${text}`;
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  node,
  onBack,
  subject,
  selectedMessageId,
}) => {
  const { addMessage } = useConversationStore();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);

  if (!node) {
    return null;
  }

  const generateSuggestions = async (message: string) => {
    setIsSuggestionsLoading(true);
    try {
      const result = await generateSuggestionPills({
        data: {
          subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          currentMessage: message,
        },
      });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  const sendInitialMessage = async () => {
    setIsLoading(true);
    try {
      const result = await chat({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message:
            "Ignore this message and dive into the topic immediately. No preamble at all, no 'as we were discussing', no 'let's continue'. Nothing. Just dive in.",
        },
      });

      // Generate learning content from the response
      const learningResult = await chat({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message: generateLearningPrompt(result.response),
        },
      });

      // Parse the learning content
      const content = JSON.parse(learningResult.response);

      const message = {
        text: result.response,
        isUser: false,
        id: Date.now().toString(),
        content: {
          summary: content.summary,
          takeaways: content.takeaways,
        },
      };
      addMessage(message);
      setCurrentMessage(message);
      generateSuggestions(result.response);
    } catch (error) {
      console.error("Error sending initial message:", error);
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        id: Date.now().toString(),
      };
      addMessage(errorMessage);
      setCurrentMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (message?: string) => {
    if ((!message && !input.trim()) || isLoading) return;

    const userMessage = message || input.trim();
    setInput("");
    setIsLoading(true);
    setSuggestions([]);

    // Add user message to conversation
    const userMessageObj = {
      text: userMessage,
      isUser: true,
      id: Date.now().toString(),
      parentId: selectedMessageId,
    };
    addMessage(userMessageObj);

    try {
      const result = await chat({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message: userMessage,
        },
      });

      // Generate learning content from the response
      const learningResult = await chat({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message: generateLearningPrompt(result.response),
        },
      });

      // Parse the learning content
      const content = JSON.parse(learningResult.response);

      const assistantMessage = {
        text: result.response,
        isUser: false,
        id: (Date.now() + 1).toString(),
        parentId: userMessageObj.id,
        content: {
          summary: content.summary,
          takeaways: content.takeaways,
        },
      };
      addMessage(assistantMessage);
      setCurrentMessage(assistantMessage);
      generateSuggestions(result.response);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        id: Date.now().toString(),
        parentId: userMessageObj.id,
      };
      addMessage(errorMessage);
      setCurrentMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    sendInitialMessage();
  }, [node.label]);

  return (
    <div className="flex h-full bg-slate-900 text-slate-300 z-50 relative">
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
            <LayoutGroup>
              <motion.div
                layout
                className="bg-card rounded-lg shadow-lg p-8 max-w-4xl w-full max-h-[85vh] flex flex-col"
              >
                <motion.div layout className="mb-6 flex-shrink-0">
                  <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                    {node.label}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {node.description}
                  </p>
                </motion.div>

                <motion.div
                  layout
                  className="mb-6 overflow-y-auto flex-1 bg-slate-800/50 rounded-lg p-6 shadow-inner"
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="h-full flex items-center justify-center"
                      >
                        <LoadingBubble />
                      </motion.div>
                    ) : currentMessage ? (
                      <motion.div
                        key={currentMessage.text}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div>
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
                </motion.div>

                <motion.div
                  layout
                  className="flex flex-col space-y-3 flex-shrink-0"
                >
                  <motion.div
                    layout
                    className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700"
                  >
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
                      onClick={() => handleSend()}
                      className={`text-cyan-400 hover:text-cyan-300 focus:outline-none focus:text-cyan-300 transition-colors p-2 pr-4 ${
                        isLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={isLoading}
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  </motion.div>

                  {suggestions.length > 0 && (
                    <motion.div
                      layout
                      className="flex flex-wrap gap-2 px-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSend(suggestion)}
                          className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm px-3 py-1 rounded-full transition-colors"
                          disabled={isLoading}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {isSuggestionsLoading && (
                    <motion.div
                      layout
                      className="flex justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="bg-slate-700/50 text-slate-400 text-sm px-3 py-1 rounded-full">
                        Generating suggestions...
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </LayoutGroup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
