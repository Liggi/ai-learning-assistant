import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";

export interface NodeData extends Record<string, unknown> {
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

interface ChatScreenProps {
  node: NodeData;
  onBack: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ node, onBack }) => {
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>(
    []
  );
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, isUser: true }]);
      setInput("");
      // Simulate AI response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            text: `Here's some information about ${node.label}...`,
            isUser: false,
          },
        ]);
      }, 1000);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <div className="flex flex-1 relative">
        {/* Background gradient that spans the entire interface */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 pointer-events-none" />

        {/* Sidebar with subtle separation */}
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

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative z-10">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                    msg.isUser
                      ? "bg-cyan-600/90 text-white"
                      : "bg-slate-800/90 text-slate-300"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with more prominent styling */}
          <div className="p-4 bg-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 bg-transparent text-slate-300 rounded-l-full px-4 py-2 focus:outline-none text-sm"
                placeholder="Type your message..."
              />
              <button
                onClick={handleSend}
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

export default ChatScreen;
