import React, { useState, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { generate as generateLesson } from "@/features/generators/lesson";
import { generate as generateSuggestedQuestions } from "@/features/generators/suggested-questions";
import { generate as generateTooltips } from "@/features/generators/tooltips";
import { extractBoldedSegments } from "@/utils/extractBolded";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useConversationStore } from "@/features/chat/store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onNewMessage?: (messageId: string) => void;
}

const generateLearningPrompt = (text: string) => {
  return `Please take the following text about ${text} and produce the following:

A concise, short sentence (10 words or less) capturing the essence of the idea(s) being taught.
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
  onNewMessage,
}) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const { messages, addMessage, activeNodeId, setActiveNode } =
    useConversationStore((state) => ({
      messages: state.messages,
      addMessage: state.addMessage,
      activeNodeId: state.activeNodeId,
      setActiveNode: state.setActiveNode,
    }));
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [currentView, setCurrentView] = useState<"roadmap" | "conversation">(
    "conversation"
  );
  const [tooltips, setTooltips] = useState<Record<string, string>>({});

  const generateSuggestions = useCallback(
    async (message: string) => {
      setSuggestions([]);
      setIsSuggestionsLoading(true);
      try {
        const result = await generateSuggestedQuestions({
          data: {
            subject,
            moduleTitle: node?.label || "",
            moduleDescription: node?.description || "",
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
    },
    [subject, node?.label, node?.description]
  );

  const processMessageAndGenerateTooltips = useCallback(
    async (messageText: string) => {
      const boldedConcepts = extractBoldedSegments(messageText);
      if (boldedConcepts.length) {
        try {
          const tooltipResult = await generateTooltips({
            data: {
              concepts: boldedConcepts,
              subject,
              moduleTitle: node?.label || "",
              moduleDescription: node?.description || "",
            },
          });
          setTooltips((prev) => ({ ...prev, ...tooltipResult.tooltips }));
        } catch (error) {
          console.error("Error generating tooltips:", error);
        }
      }
    },
    [subject, node?.label, node?.description]
  );

  const handleMessageUpdate = useCallback(
    (message: Message) => {
      addMessage(message);
      setCurrentMessage(message);
      setActiveNode(message.id ?? "");
      onNewMessage?.(message.id ?? "");
    },
    [addMessage, setActiveNode, onNewMessage]
  );

  const sendInitialMessage = useCallback(async () => {
    if (!node?.label) return;

    // Since we know node exists and has label at this point, TypeScript should infer description exists too
    const { label, description } = node;

    console.log("Starting sendInitialMessage");
    setIsLoading(true);
    try {
      console.log("Sending initial chat request");
      const result = await generateLesson({
        data: {
          subject: subject,
          moduleTitle: label,
          moduleDescription: description,
          message:
            "Ignore this message and dive into the topic immediately. No preamble at all, no 'as we were discussing', no 'let's continue'. Nothing. Just dive in.",
        },
      });

      await processMessageAndGenerateTooltips(result.response);

      console.log("Got initial chat response, generating learning content");
      const learningResult = await generateLesson({
        data: {
          subject: subject,
          moduleTitle: label,
          moduleDescription: description,
          message: generateLearningPrompt(result.response),
        },
      });

      console.log("Got learning content, parsing and adding message");
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

      handleMessageUpdate(message);
      generateSuggestions(result.response);
    } catch (error) {
      console.error("Error sending initial message:", error);
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        id: Date.now().toString(),
      };
      handleMessageUpdate(errorMessage);
    } finally {
      console.log("Finished sendInitialMessage");
      setIsLoading(false);
    }
  }, [
    subject,
    node?.label,
    node?.description,
    handleMessageUpdate,
    generateSuggestions,
    processMessageAndGenerateTooltips,
  ]);

  // Effect to handle selected message updates
  useEffect(() => {
    if (!selectedMessageId) return;

    const message = messages.find((msg) => msg.id === selectedMessageId);
    if (message) {
      setCurrentMessage(message);
      generateSuggestions(message.text);
    }
  }, [selectedMessageId, messages, generateSuggestions]);

  // Effect to reset initialization on node change
  useEffect(() => {
    if (node?.id) {
      setHasInitialized(false);
    }
  }, [node?.id]);

  // Effect to handle initial message
  useEffect(() => {
    if (!hasInitialized && node?.label) {
      setHasInitialized(true);
      sendInitialMessage();
    }
  }, [hasInitialized, node?.label, sendInitialMessage]);

  if (!node) return null;

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
      ...(activeNodeId ? { parentId: activeNodeId } : {}),
    };
    addMessage(userMessageObj);

    try {
      const result = await generateLesson({
        data: {
          subject: subject,
          moduleTitle: node.label,
          moduleDescription: node.description,
          message: userMessage,
        },
      });

      await processMessageAndGenerateTooltips(result.response);

      // Generate learning content from the response
      const learningResult = await generateLesson({
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
      setActiveNode(assistantMessage.id);
      onNewMessage?.(assistantMessage.id);
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
                  <div className="space-y-8">
                    {/* Title section */}
                    <div className="space-y-4">
                      <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/3" />
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-5/6" />
                      </div>
                    </div>

                    {/* Content section */}
                    <div className="space-y-4">
                      <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/4" />
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-11/12" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-4/5" />
                      </div>
                    </div>

                    {/* Code block section */}
                    <div className="space-y-3">
                      <div className="h-3 bg-slate-700/50 rounded animate-pulse w-1/5" />
                      <div className="space-y-2 bg-slate-700/20 rounded-lg p-4">
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-11/12" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-2/3" />
                      </div>
                    </div>

                    {/* List section */}
                    <div className="space-y-3">
                      <div className="h-3 bg-slate-700/50 rounded animate-pulse w-1/6" />
                      <div className="space-y-2 pl-4">
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-5/6" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-3/4" />
                      </div>
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
                    className="prose prose-invert prose-sm max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 prose-pre:bg-transparent
                             [&>h1+h2]:mt-3 [&>h2+h3]:mt-2"
                    components={{
                      h1: ({ children }) => (
                        <h1 className="relative mb-4 text-xl font-semibold ml-2">
                          <div className="absolute -left-3 h-7 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-500"></div>
                          <span className="bg-gradient-to-r from-orange-100 to-orange-300 bg-clip-text text-transparent">
                            {children}
                          </span>
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="relative mb-4 text-lg font-semibold ml-2">
                          <div className="absolute -left-3 h-6 w-1 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500"></div>
                          <span className="bg-gradient-to-r from-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                            {children}
                          </span>
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="relative mb-3 text-base font-semibold ml-2">
                          <div className="absolute -left-3 h-5 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
                          <span className="bg-gradient-to-r from-purple-100 to-purple-300 bg-clip-text text-transparent">
                            {children}
                          </span>
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-300 leading-relaxed mb-5 text-[14px] pl-2">
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
                                ? "bg-slate-800/50 rounded px-1 py-0.5 text-[13px] text-orange-200/90"
                                : "block bg-slate-800/50 px-4 py-3 text-[13px] leading-relaxed text-orange-100/90 border-l-2 border-orange-500/20 my-4"
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      },
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-300 pl-3">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <div className="flex items-start gap-2 text-sm text-slate-300 mb-1">
                          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500/40 flex-shrink-0" />
                          <div>{children}</div>
                        </div>
                      ),
                      strong: ({ children }) => {
                        const concept = String(children).trim();
                        const tooltipText = tooltips[concept];

                        if (!tooltipText) {
                          return (
                            <span className="font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent px-0.5">
                              {children}
                            </span>
                          );
                        }

                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent px-0.5 cursor-pointer relative
                                             after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px]
                                             after:bg-gradient-to-r after:from-amber-200/0 after:via-amber-300/50 after:to-yellow-400/0
                                             after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300
                                             hover:from-amber-100 hover:to-yellow-300 transition-all duration-200"
                              >
                                {children}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              className="max-w-[250px] p-4 text-sm 
                              bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900
                              text-slate-100 border border-slate-600/50 
                              backdrop-blur-sm
                              -translate-y-3
                              rounded-xl
                              animate-in fade-in-0 zoom-in-95 duration-200
                              data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
                              shadow-[0_-8px_40px_-12px] shadow-amber-500/20
                              ring-1 ring-amber-500/10
                              after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px]
                              after:bg-gradient-to-r after:from-amber-500/0 after:via-amber-500/30 after:to-amber-500/0"
                            >
                              {tooltipText}
                            </TooltipContent>
                          </Tooltip>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote
                          className="p-4 my-4 mt-6 rounded-xl backdrop-blur-sm
                                             bg-green-900/10 border border-green-500/20
                                             hover:bg-green-900/20 transition-all duration-200
                                             not-prose"
                        >
                          <div className="text-xs font-medium mb-2 text-green-400">
                            Key Takeaways
                          </div>
                          <div className="space-y-2 pt-2 border-t border-slate-700/50">
                            {children}
                          </div>
                        </blockquote>
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
                      shadow-lg"
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
          {!isLoading && suggestions.length > 0 && (
            <motion.div
              layout
              className="max-w-3xl mx-auto flex flex-wrap gap-2 mt-4"
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
          {(isSuggestionsLoading || isLoading) && (
            <motion.div
              layout
              className="max-w-3xl mx-auto flex flex-wrap gap-2 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[
                { width: "w-64" },
                { width: "w-48" },
                { width: "w-56" },
                { width: "w-40" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="px-3 py-2 rounded-xl backdrop-blur-sm
                           bg-orange-500/[0.07] border border-orange-500/[0.15]
                           animate-pulse"
                >
                  <div className="h-2.5 w-12 bg-orange-500/20 rounded mb-0.5" />
                  <div
                    className={`h-3.5 ${item.width} bg-orange-500/10 rounded`}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
