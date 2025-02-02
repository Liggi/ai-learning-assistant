import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import ChatLayout from "@/components/chat-layout";
import {
  generateRoadmapBadges,
  ModuleBadge,
} from "@/features/badges/generator";
import { RoadmapNodeData } from "@/features/roadmap/store";

// Define a static roadmap for React learning
const STATIC_ROADMAP = {
  nodes: [
    {
      id: "1",
      type: "normalNode",
      position: { x: 0, y: 0 },
      data: {
        label: "React Fundamentals",
        description:
          "Core concepts of React including components, props, and JSX",
        status: "not-started" as const,
        type: "roadmap" as const,
      },
    },
    {
      id: "2",
      type: "normalNode",
      position: { x: 0, y: 200 },
      data: {
        label: "React Hooks",
        description:
          "Learn about React's Hooks API and how to use them effectively in your components",
        status: "not-started" as const,
        type: "roadmap" as const,
      },
    },
    {
      id: "3",
      type: "normalNode",
      position: { x: 0, y: 400 },
      data: {
        label: "State Management",
        description:
          "Advanced state management patterns and libraries in React",
        status: "not-started" as const,
        type: "roadmap" as const,
      },
    },
    {
      id: "4",
      type: "normalNode",
      position: { x: 0, y: 600 },
      data: {
        label: "Component Patterns",
        description: "Advanced component patterns and best practices",
        status: "not-started" as const,
        type: "roadmap" as const,
      },
    },
    {
      id: "5",
      type: "normalNode",
      position: { x: 0, y: 800 },
      data: {
        label: "Performance Optimization",
        description: "Techniques for optimizing React application performance",
        status: "not-started" as const,
        type: "roadmap" as const,
      },
    },
  ],
};

export const Route = createFileRoute("/chat")({
  component: ChatRoute,
});

function ChatRoute() {
  const navigate = useNavigate();
  const [roadmapBadges, setRoadmapBadges] = useState<ModuleBadge[]>([]);

  // Add error boundary
  const [error, setError] = useState<Error | null>(null);
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="p-4 bg-red-50 text-red-500 rounded">
          Error: {error.message}
        </div>
      </div>
    );
  }

  // Safely access sample node
  const sampleNode = STATIC_ROADMAP.nodes[1]?.data;
  if (!sampleNode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="p-4">No sample node found</div>
      </div>
    );
  }

  // Add diagnostic logging
  console.log("STATIC_ROADMAP check:", {
    nodesLength: STATIC_ROADMAP.nodes.length,
    node1: STATIC_ROADMAP.nodes[1],
    allNodes: STATIC_ROADMAP.nodes,
  });

  // Generate badges once on mount
  useEffect(() => {
    console.log("Generating badges for static route");
    async function generateBadges() {
      try {
        const badges = await generateRoadmapBadges({
          data: {
            subject: "React",
            nodes: STATIC_ROADMAP.nodes,
            selectedKnowledgeNodes: [], // Empty for the static route
          },
        });
        console.log("Generated badges:", badges);
        setRoadmapBadges(badges);
      } catch (error) {
        console.error("Error generating badges:", error);
      }
    }

    generateBadges();
  }, []); // Only run once on mount

  console.log("ChatRoute render", {
    sampleNodeLabel: sampleNode.label,
    badgesCount: roadmapBadges.length,
  });

  return (
    <div className="min-h-screen bg-background">
      <ChatLayout
        node={sampleNode}
        subject="React"
        onBack={() => navigate({ to: "/" })}
      />
    </div>
  );
}
