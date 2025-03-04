export interface NodeData extends Record<string, unknown> {
  id?: string;
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

export interface Message {
  text: string;
  isUser: boolean;
  id?: string;
  parentId?: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
}

export interface ChatInterfaceProps {
  node?: NodeData;
  onBack: () => void;
  subject: string;
  selectedMessageId?: string;
  onNewMessage?: (messageId: string) => void;
}
