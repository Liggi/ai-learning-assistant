import React, { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { LoadingBubble } from "./ui/loading-bubble";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

interface ChatInterfaceStaticProps {
  node?: {
    label: string;
    description: string;
  };
  onBack?: () => void;
  initialMessage?: string;
  staticResponses?: Record<string, string>;
}

interface Message {
  text: string;
  isUser: boolean;
}

const DEFAULT_NODE = {
  label: "Advanced Data Structures",
  description: "Implementation of trees, graphs, hash tables",
};

const DEFAULT_RESPONSES = {
  "Let's begin our lesson.":
    "Welcome! I'll help you understand this topic. What specific aspects would you like to learn about?",
  "What are the key concepts?":
    "Here are the key concepts:\n\n1. Data Organization\n2. Algorithmic Efficiency\n3. Memory Management\n4. Implementation Patterns\n5. Use Cases",
  "Can you show an example?":
    "Here's a practical example:\n\n```typescript\nclass BinaryTree {\n  value: number;\n  left: BinaryTree | null;\n  right: BinaryTree | null;\n\n  constructor(value: number) {\n    this.value = value;\n    this.left = null;\n    this.right = null;\n  }\n}\n```\n\nWould you like me to explain how this works?",
};

const INITIAL_MESSAGES = [
  "# Welcome to Advanced Data Structures! \n\nI'm here to help you understand complex data structures and their implementations. What would you like to learn about first?",

  "Ready to explore data structures? Let's start with what interests you most:\n\n- Trees and Graphs\n- Hash Tables\n- Heaps\n- Advanced Arrays",

  "## Data Structures Journey\n\nWe can explore:\n\n1. Implementation details\n2. Time complexity\n3. Real-world applications\n\nWhat interests you?",

  "Let's dive into the world of data structures! Would you prefer to:\n\n- Start with basic concepts\n- Jump into implementation\n- Explore practical examples",

  "**Quick Start Guide**\n\n```typescript\n// Example: Binary Search Tree\nclass BST {\n  insert(value: number) { /* ... */ }\n  search(value: number) { /* ... */ }\n}\n```\n\nWant to learn how this works?",

  "# Welcome to Advanced Data Structures! \n\n## Your Learning Journey Begins\n\nData structures are fundamental to computer science and software engineering. They provide the building blocks for efficient algorithms and scalable applications. Let's explore this fascinating topic together!\n\n### What We'll Cover\n\n1. **Fundamental Concepts**\n   - Abstract Data Types (ADTs)\n   - Time and Space Complexity\n   - Memory Management\n   - Iterator Patterns\n\n2. **Implementation Approaches**\n   ```typescript\n   interface DataStructure<T> {\n     add(item: T): void;\n     remove(item: T): boolean;\n     contains(item: T): boolean;\n   }\n   ```\n\n3. **Real-world Applications**\n   - Database Systems\n   - Operating Systems\n   - Network Routing\n   - Game Development\n\n### Getting Started\n\nChoose your preferred learning path:\n- 🌱 Beginner: Start with basic concepts\n- 🚀 Intermediate: Jump into implementations\n- 💡 Advanced: Explore optimizations\n\nWhat interests you most?",
];

const RESPONSE_MESSAGES = [
  "Here are some key concepts to consider:\n\n1. Time Complexity\n2. Space Efficiency\n3. Implementation Trade-offs\n\nWhich aspect interests you most?",

  "Let me break this down:\n\n```typescript\ninterface DataStructure {\n  insert(data: any): void;\n  delete(data: any): void;\n  search(data: any): boolean;\n}\n```\n\nWhat would you like to know about these operations?",

  "**Great question!** Here are some practical applications:\n\n- Social Network Graphs\n- File System Trees\n- Database Indexing\n- Game Development",

  "## Implementation Approaches\n\nWe can explore this from different angles:\n\n1. Iterative vs Recursive\n2. Memory-efficient vs Time-efficient\n3. Mutable vs Immutable\n\nWhat's your preference?",

  "Let's look at a real-world scenario:\n\n```typescript\nclass Graph {\n  private vertices: Map<string, Set<string>>;\n  addEdge(from: string, to: string) { /* ... */ }\n}\n```\n\nShall we discuss how this works in practice?",

  "# Deep Dive: Data Structure Implementations\n\nLet's explore how these concepts work in practice. Here's a comprehensive look at a self-balancing tree implementation:\n\n## AVL Tree Implementation\n\n```typescript\nclass AVLNode<T> {\n  value: T;\n  height: number = 1;\n  left: AVLNode<T> | null = null;\n  right: AVLNode<T> | null = null;\n\n  constructor(value: T) {\n    this.value = value;\n  }\n}\n\nclass AVLTree<T> {\n  private root: AVLNode<T> | null = null;\n  \n  private getHeight(node: AVLNode<T> | null): number {\n    return node ? node.height : 0;\n  }\n  \n  private getBalance(node: AVLNode<T>): number {\n    return this.getHeight(node.left) - this.getHeight(node.right);\n  }\n}\n```\n\n### Key Benefits\n1. **Self-balancing property** ensures O(log n) operations\n2. **Height-balance factor** maintains optimal structure\n3. **Automatic rebalancing** through rotations\n\n### Common Applications\n- Database indexing\n- File system organization\n- In-memory caching\n- Priority queue implementations\n\nWould you like to see how the balancing operations work?",

  "## Understanding Time Complexity and Performance\n\nLet's break down the performance characteristics of different data structures and their real-world implications.\n\n### Comparative Analysis\n\n#### Basic Operations\n1. **Insertion Performance**\n   - Arrays: O(1) at end, O(n) at arbitrary position\n   - Linked Lists: O(1) with node reference, O(n) for position\n   - Binary Trees: O(log n) average, O(n) worst case\n\n2. **Search Operations**\n   ```typescript\n   interface Searchable<T> {\n     // O(log n) for balanced trees\n     search(value: T): boolean;\n     \n     // O(1) for hash tables\n     contains(value: T): boolean;\n     \n     // O(n) for unsorted arrays\n     find(predicate: (value: T) => boolean): T | undefined;\n   }\n   ```\n\n### Memory Usage Patterns\n| Structure | Space per Element | Overhead |\n|-----------|------------------|----------|\n| Array     | sizeof(T)        | Small    |\n| Linked List| sizeof(T) + ptr | Medium   |\n| Hash Table| sizeof(T) + ptr  | Large    |\n\n### Optimization Techniques\n1. **Lazy Loading**\n2. **Caching Strategies**\n3. **Memory Pooling**\n\nWould you like to explore any of these concepts in more detail?",
];

const ChatInterfaceStatic: React.FC<ChatInterfaceStaticProps> = ({
  node = DEFAULT_NODE,
  onBack = () => {},
  initialMessage = "Let's begin our lesson.",
  staticResponses = DEFAULT_RESPONSES,
}) => {
  const [currentMessage, setCurrentMessage] = useState<Message | null>({
    text: INITIAL_MESSAGES[Math.floor(Math.random() * INITIAL_MESSAGES.length)],
    isUser: false,
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response =
      RESPONSE_MESSAGES[Math.floor(Math.random() * RESPONSE_MESSAGES.length)];
    setCurrentMessage({ text: response, isUser: false });
    setIsLoading(false);
  };

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
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  layout
                  className="flex items-center space-x-2 bg-slate-700 rounded-full shadow-inner ring-1 ring-slate-700 flex-shrink-0"
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
                    onClick={handleSend}
                    className={`text-cyan-400 hover:text-cyan-300 focus:outline-none focus:text-cyan-300 transition-colors p-2 pr-4 ${
                      isLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={isLoading}
                    aria-label="Send message"
                  >
                    <Send size={18} />
                  </button>
                </motion.div>
              </motion.div>
            </LayoutGroup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterfaceStatic;
