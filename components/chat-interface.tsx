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
  const [currentView, setCurrentView] = useState<"roadmap" | "conversation">(
    "conversation"
  );

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
    <div className="flex-1 flex flex-col h-screen bg-slate-900 text-slate-300">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-slate-800">
        <h2 className="text-lg font-medium text-slate-200">{node?.label}</h2>
        <p className="text-sm text-slate-400/80 mt-1">{node?.description}</p>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-8">
          <div className="max-w-3xl mx-auto w-full space-y-6 py-6">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-800/30
                           border border-slate-700/50 backdrop-blur-sm
                           p-6 shadow-lg"
                >
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-700/50 rounded animate-pulse w-2/3" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-700/50 rounded animate-pulse" />
                      <div className="h-3 bg-slate-700/50 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-slate-700/50 rounded animate-pulse w-3/4" />
                    </div>
                  </div>
                </motion.div>
              ) : currentMessage ? (
                <motion.div
                  key={currentMessage.text}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-800/30
                           border border-slate-700/50 backdrop-blur-sm
                           p-6 shadow-lg"
                >
                  <ReactMarkdown
                    className="prose prose-invert prose-sm max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0"
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-[17px] font-medium text-slate-100 mt-0 mb-4">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-[15px] font-medium text-slate-100 mt-5 mb-3">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-[14px] font-medium text-slate-200 mt-4 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 leading-relaxed mb-3 text-[14px]">
                          {children}
                        </p>
                      ),
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match;
                        return (
                          <code
                            className={`${className} ${
                              isInline
                                ? "bg-slate-700/30 rounded px-1 py-0.5 text-[13px] text-slate-200"
                                : "block bg-slate-800/50 p-3 rounded-lg my-3 text-[13px] leading-relaxed text-slate-200"
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1.5 mb-3 text-slate-300">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-slate-300 text-[14px]">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-medium text-slate-100">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {currentMessage.text}
                  </ReactMarkdown>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Area */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="px-8 py-4">
          {/* Message input */}
          <div
            className="max-w-3xl mx-auto flex items-center space-x-2 rounded-lg 
                      bg-gradient-to-r from-slate-800/50 to-slate-800/30
                      border border-slate-700/50 backdrop-blur-sm
                      shadow-lg mb-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent text-slate-300 px-4 py-3.5
                       focus:outline-none text-sm"
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              className={`text-cyan-400 hover:text-cyan-300 focus:outline-none 
                        focus:text-cyan-300 transition-colors p-4 ${
                          isLoading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
              disabled={isLoading}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <motion.div
              layout
              className="max-w-3xl mx-auto flex flex-wrap gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(suggestion)}
                  className="px-3 py-2 text-[13px] group text-left
                           rounded-xl backdrop-blur-sm
                           bg-orange-500/[0.07] hover:bg-orange-500/[0.12]
                           border border-orange-500/[0.15]
                           hover:shadow-[0_0_10px_rgba(251,146,60,0.07)]
                           hover:text-white relative
                           transition-all duration-200 ease-in-out"
                  disabled={isLoading}
                >
                  <div className="font-medium text-orange-400/90 text-xs mb-0.5">
                    Question
                  </div>
                  <div className="font-medium text-slate-200">{suggestion}</div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Loading indicator for suggestions */}
          {isSuggestionsLoading && (
            <motion.div
              layout
              className="max-w-3xl mx-auto flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-sm text-slate-400">
                Generating suggestions...
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
