import React, { useCallback, useMemo } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
} from "@xyflow/react";
import ArticleNode from "./react-flow/article-node";
import QuestionNode from "./react-flow/question-node";
import dagre from "dagre";

// --- Constants for Node Dimensions ---
const ARTICLE_NODE_WIDTH = 300;
const ARTICLE_NODE_HEIGHT = 180; // Adjusted based on ArticleNode content
const QUESTION_NODE_WIDTH = 200;
const QUESTION_NODE_HEIGHT = 80; // Adjusted based on QuestionNode content
// --- End Constants ---

// --- Dagre Layout Function ---
const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = "TB" // Top-to-Bottom layout
): { nodes: Node[]; edges: Edge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 100, // Increased horizontal spacing between nodes in same rank
    ranksep: 150, // Increased vertical spacing between ranks
  });

  nodes.forEach((node) => {
    // Use dimensions from constants based on node type or data
    const nodeWidth =
      node.data?.nodeType === "question"
        ? QUESTION_NODE_WIDTH
        : ARTICLE_NODE_WIDTH;
    const nodeHeight =
      node.data?.nodeType === "question"
        ? QUESTION_NODE_HEIGHT
        : ARTICLE_NODE_HEIGHT;
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // Adjust position: Dagre positions center, React Flow uses top-left
    node.position = {
      x: nodeWithPosition.x - nodeWithPosition.width / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    };
    return node;
  });

  return { nodes: layoutedNodes, edges };
};
// --- End Layout Function ---

interface PersonalLearningMapFlowProps {
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = {
  articleNode: ArticleNode,
  questionNode: QuestionNode,
};

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  onNodeClick,
}) => {
  // --- Hardcoded Nodes & Edges ---
  const initialNodes: Node[] = [
    // First branch: Root article with 3 questions, each leading to an article,
    // then each of those articles leads to 2 questions, each leading to another article

    // Root article (Level 1)
    {
      id: "article-1",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Introduction to React",
        description:
          "Learn the basics of React, components, and state management. A comprehensive overview for beginners.",
        status: "completed",
      },
    },

    // First level questions (Level 2)
    {
      id: "question-1-1",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-1",
        text: "What are React Hooks and how do they work?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-2",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2",
        text: "How does the Virtual DOM improve performance?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-3",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-3",
        text: "What is JSX and why is it used in React?",
        isImplicit: false,
      },
    },

    // First level articles (Level 3)
    {
      id: "article-1-1",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "React Hooks Deep Dive",
        description:
          "Comprehensive guide to useState, useEffect, useContext, and custom hooks. Learn how to manage state and side effects.",
        status: "in-progress",
        progress: 75,
      },
    },
    {
      id: "article-1-2",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Virtual DOM and Reconciliation",
        description:
          "How React's Virtual DOM works behind the scenes. Learn about the diffing algorithm and reconciliation process.",
        status: "in-progress",
        progress: 30,
      },
    },
    {
      id: "article-1-3",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "JSX Syntax and Compilation",
        description:
          "Deep dive into JSX syntax, how it compiles to JavaScript, and best practices for writing efficient components.",
        status: "not-started",
      },
    },

    // Second level questions for article-1-1 (Level 4)
    {
      id: "question-1-1-1",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-1-1",
        text: "How do custom hooks share logic between components?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-1-2",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-1-2",
        text: "What are the rules of hooks and why do they matter?",
        isImplicit: false,
      },
    },

    // Second level questions for article-1-2 (Level 4)
    {
      id: "question-1-2-1",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2-1",
        text: "How does React's diffing algorithm work?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-2-2",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2-2",
        text: "What are reconciliation keys and why are they important?",
        isImplicit: false,
      },
    },

    // Second level questions for article-1-3 (Level 4)
    {
      id: "question-1-3-1",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-3-1",
        text: "How does Babel transform JSX to JavaScript?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-3-2",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-3-2",
        text: "What are JSX fragments and when should you use them?",
        isImplicit: false,
      },
    },

    // Third level articles (from second level questions) (Level 5)
    // From article-1-1 questions
    {
      id: "article-1-1-1",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Custom Hooks Pattern",
        description:
          "Advanced patterns and best practices for creating reusable custom hooks in React applications.",
        status: "not-started",
      },
    },
    {
      id: "article-1-1-2",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Rules of Hooks Explained",
        description:
          "Detailed explanation of hook rules, their technical reasons, and tools to enforce them in your codebase.",
        status: "not-started",
      },
    },

    // From article-1-2 questions
    {
      id: "article-1-2-1",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "React Diffing Algorithm",
        description:
          "Technical deep dive into how React compares virtual DOM trees and minimizes DOM operations.",
        status: "not-started",
      },
    },
    {
      id: "article-1-2-2",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Optimizing with Keys",
        description:
          "How to use keys effectively to improve performance and avoid common pitfalls in list rendering.",
        status: "not-started",
      },
    },

    // From article-1-3 questions
    {
      id: "article-1-3-1",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "JSX Transformation",
        description:
          "Exploring how Babel and other transpilers convert JSX into React.createElement calls.",
        status: "not-started",
      },
    },
    {
      id: "article-1-3-2",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "JSX Fragments",
        description:
          "Understanding React Fragments, their syntax variations, and when to use them in your components.",
        status: "not-started",
      },
    },
  ];

  const initialEdges: Edge[] = [
    // Level 1 -> Level 2: Root article to first level questions
    { id: "e1-1", source: "article-1", target: "question-1-1", animated: true },
    { id: "e1-2", source: "article-1", target: "question-1-2", animated: true },
    { id: "e1-3", source: "article-1", target: "question-1-3", animated: true },

    // Level 2 -> Level 3: First level questions to first level articles
    {
      id: "e1-4",
      source: "question-1-1",
      target: "article-1-1",
      animated: true,
    },
    {
      id: "e1-5",
      source: "question-1-2",
      target: "article-1-2",
      animated: true,
    },
    {
      id: "e1-6",
      source: "question-1-3",
      target: "article-1-3",
      animated: true,
    },

    // Level 3 -> Level 4: First level articles to second level questions
    {
      id: "e1-7",
      source: "article-1-1",
      target: "question-1-1-1",
      animated: true,
    },
    {
      id: "e1-8",
      source: "article-1-1",
      target: "question-1-1-2",
      animated: true,
    },

    {
      id: "e1-9",
      source: "article-1-2",
      target: "question-1-2-1",
      animated: true,
    },
    {
      id: "e1-10",
      source: "article-1-2",
      target: "question-1-2-2",
      animated: true,
    },

    {
      id: "e1-11",
      source: "article-1-3",
      target: "question-1-3-1",
      animated: true,
    },
    {
      id: "e1-12",
      source: "article-1-3",
      target: "question-1-3-2",
      animated: true,
    },

    // Level 4 -> Level 5: Second level questions to second level articles
    {
      id: "e1-13",
      source: "question-1-1-1",
      target: "article-1-1-1",
      animated: true,
    },
    {
      id: "e1-14",
      source: "question-1-1-2",
      target: "article-1-1-2",
      animated: true,
    },

    {
      id: "e1-15",
      source: "question-1-2-1",
      target: "article-1-2-1",
      animated: true,
    },
    {
      id: "e1-16",
      source: "question-1-2-2",
      target: "article-1-2-2",
      animated: true,
    },

    {
      id: "e1-17",
      source: "question-1-3-1",
      target: "article-1-3-1",
      animated: true,
    },
    {
      id: "e1-18",
      source: "question-1-3-2",
      target: "article-1-3-2",
      animated: true,
    },
  ];
  // --- End Hardcoded Data ---

  // --- Use Layout ---
  const { nodes, edges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, "TB"), // Using Top-to-Bottom layout
    [initialNodes, initialEdges]
  );
  // --- End Use Layout ---

  const handleNodeClick = useCallback(
    (event: any, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
          }}
        >
          <Background color="#aaa" gap={16} />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default PersonalLearningMapFlow;
