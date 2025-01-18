import React from "react";
import { ArrowLeft, Send } from "lucide-react";
import { LoadingBubble } from "./ui/loading-bubble";

interface ChatScreenStaticProps {
  node?: {
    label: string;
    description: string;
  };
  onBack?: () => void;
}

const DEFAULT_NODE = {
  label: "Advanced Data Structures",
  description: "Implementation of trees, graphs, hash tables",
};

const ChatScreenStatic: React.FC<ChatScreenStaticProps> = ({
  node = DEFAULT_NODE,
  onBack = () => {},
}) => {
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
                <div className="h-full flex items-center justify-center">
                  <LoadingBubble />
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700 flex-shrink-0">
                <input
                  type="text"
                  className="flex-1 bg-transparent text-slate-300 rounded-l-full px-4 py-2 focus:outline-none text-sm"
                  placeholder="Type your message..."
                  disabled
                />
                <button
                  className="text-cyan-400/50 cursor-not-allowed focus:outline-none p-2 pr-4"
                  aria-label="Send message"
                  disabled
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

export default ChatScreenStatic;
