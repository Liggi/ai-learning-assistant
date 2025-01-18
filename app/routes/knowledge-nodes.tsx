import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import KnowledgeNodesStep from "@/components/knowledge-nodes-step";

const SAMPLE_KNOWLEDGE_NODES = [
  "JavaScript Fundamentals",
  "React Components",
  "State Management",
  "TypeScript Basics",
  "CSS and Styling",
  "Web APIs",
  "Testing Principles",
  "Git Version Control",
  "Node.js Basics",
  "HTTP and REST",
  "Database Concepts",
  "Authentication",
  "Performance Optimization",
  "Responsive Design",
  "Accessibility",
  "Security Best Practices",
];

export const Route = createFileRoute("/knowledge-nodes")({
  component: KnowledgeNodesRoute,
});

function KnowledgeNodesRoute() {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const handleToggleNode = (id: string) => {
    const newSelected = new Set(selectedNodes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNodes(newSelected);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <KnowledgeNodesStep
        knowledgeNodes={SAMPLE_KNOWLEDGE_NODES}
        selectedKnowledgeNodes={selectedNodes}
        onToggleNode={handleToggleNode}
        onBack={() => console.log("Back clicked")}
        onNext={() => console.log("Next clicked")}
      />
    </div>
  );
}
