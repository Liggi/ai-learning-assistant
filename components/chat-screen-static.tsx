import React, { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { LoadingBubble } from "./ui/loading-bubble";

const SAMPLE_MESSAGES = [
  {
    text: "Hello! I'm your AI tutor for React Hooks. What specific aspects would you like to learn about?",
    isUser: false,
  },
  {
    text: "I'd like to understand useEffect better, especially with dependencies.",
    isUser: true,
  },
  {
    text: "Great choice! The useEffect hook can be tricky. Let me explain with an example:\n\n```javascript\nuseEffect(() => {\n  console.log('This runs when count changes');\n}, [count]);\n```\n\nThe dependency array `[count]` tells React to run the effect only when `count` changes. Would you like me to explain more about how this works?",
    isUser: false,
  },
  {
    text: "Yes, please! What happens if I leave the dependency array empty?",
    isUser: true,
  },
  {
    text: "An empty dependency array `[]` means the effect will only run once after the initial render. It's equivalent to componentDidMount in class components.\n\nHowever, be careful! If your effect uses any variables or props, ESLint will warn you to include them in the dependencies to prevent stale closure bugs.",
    isUser: false,
  },
];

const ChatScreenStatic = () => {
  const [isLoading] = useState(true);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <div className="flex flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 pointer-events-none" />

        <div className="w-64 relative z-10 bg-slate-800/30">
          <div className="h-full p-4">
            <button
              className="mb-6 text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none"
              aria-label="Back to Roadmap"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                React Hooks
              </h2>
              <p className="text-xs text-slate-400">
                Learn about React's Hooks API and how to use them effectively in
                your components.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col relative z-10">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {SAMPLE_MESSAGES.map((msg, index) => (
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
              <div className="flex justify-end">
                <LoadingBubble />
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700">
              <input
                type="text"
                className="flex-1 bg-transparent text-slate-300 rounded-l-full px-4 py-2 focus:outline-none text-sm"
                placeholder="Type your message..."
              />
              <button
                className="text-cyan-400 hover:text-cyan-300 focus:outline-none focus:text-cyan-300 transition-colors p-2 pr-4"
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

export default ChatScreenStatic;
