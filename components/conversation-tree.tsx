import { useConversationStore } from "@/features/chat/store";

interface ConversationTreeProps {
  selectedMessageId?: string;
  onMessageSelect: (messageId: string) => void;
}

export default function ConversationTree({
  selectedMessageId,
  onMessageSelect,
}: ConversationTreeProps) {
  const { messages } = useConversationStore();

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <button
          key={message.id}
          onClick={() => message.id && onMessageSelect(message.id)}
          className={`w-full text-left p-2 rounded-lg text-sm transition-colors
                     ${
                       message.id === selectedMessageId
                         ? "bg-slate-800 text-slate-200"
                         : "hover:bg-slate-800/50 text-slate-400"
                     }
                     ${message.isUser ? "ml-4" : ""}`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                message.isUser ? "bg-cyan-400" : "bg-slate-400"
              }`}
            />
            <span className="line-clamp-2">
              {message.content?.summary || message.text}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
