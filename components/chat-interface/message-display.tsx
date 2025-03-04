import React from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Message } from "./types";

interface MessageDisplayProps {
  currentMessage: Message | null;
  isLoading: boolean;
  tooltips: Record<string, string>;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  currentMessage,
  isLoading,
  tooltips,
}) => {
  if (isLoading) {
    return (
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
    );
  }

  if (!currentMessage) {
    return null;
  }

  return (
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
  );
};
