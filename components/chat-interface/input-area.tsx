import React from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface InputAreaProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: (message?: string) => void;
  isLoading: boolean;
  suggestions: string[];
  isSuggestionsLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  input,
  setInput,
  handleSend,
  isLoading,
  suggestions,
  isSuggestionsLoading,
}) => {
  return (
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
  );
};
