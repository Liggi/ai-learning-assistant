import React, { useCallback, useMemo } from "react";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  Node as ReactFlowNode,
  Edge,
  Position,
  Handle,
} from "@xyflow/react";
import ArticleNode from "./react-flow/article-node";
import QuestionNode from "./react-flow/question-node";
import ELK from "elkjs/lib/elk.bundled.js";

// Extend the ReactFlowNode type to include our additional properties
interface ExtendedNode extends ReactFlowNode {
  sourceHandle?: string;
  targetHandle?: string;
}

// --- Constants for Node Dimensions ---
const ARTICLE_NODE_WIDTH = 300;
const ARTICLE_NODE_HEIGHT = 180; // Adjusted based on ArticleNode content
const QUESTION_NODE_WIDTH = 200;
const QUESTION_NODE_HEIGHT = 80; // Adjusted based on QuestionNode content
// --- End Constants ---

// Initialize ELK
const elk = new ELK();

// --- ELK Layout Function ---
const getLayoutedElements = async (
  nodes: ExtendedNode[],
  edges: Edge[],
  direction = "DOWN" // ELK uses UP, DOWN, LEFT, RIGHT instead of TB, LR, etc.
): Promise<{ nodes: ExtendedNode[]; edges: Edge[] }> => {
  console.log("Starting ELK layout calculation");

  try {
    // Convert nodes to ELK nodes format
    const elkNodes = nodes.map((node) => {
      // Use dimensions from constants based on node type or data
      const nodeWidth =
        node.data?.nodeType === "question"
          ? QUESTION_NODE_WIDTH
          : ARTICLE_NODE_WIDTH;
      const nodeHeight =
        node.data?.nodeType === "question"
          ? QUESTION_NODE_HEIGHT
          : ARTICLE_NODE_HEIGHT;

      return {
        id: node.id,
        width: nodeWidth,
        height: nodeHeight,
        // Add ports for more precise edge connections if needed
        ports: [
          {
            id: `${node.id}-top`,
            properties: { side: "TOP" },
          },
          {
            id: `${node.id}-bottom`,
            properties: { side: "BOTTOM" },
          },
        ],
      };
    });

    console.log("ELK nodes:", elkNodes);

    // Convert edges to ELK edges format, using the ports for better alignment
    const elkEdges = edges.map((edge) => {
      const isUpward =
        edge.source.includes("question") && edge.target.includes("article");
      return {
        id: edge.id,
        sources: [isUpward ? `${edge.source}-top` : `${edge.source}-bottom`],
        targets: [isUpward ? `${edge.target}-bottom` : `${edge.target}-top`],
      };
    });

    console.log("ELK edges:", elkEdges);

    // Configure ELK with layered layout algorithm
    const elkGraph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": direction,
        "elk.layered.spacing.nodeNodeBetweenLayers": "150", // Vertical spacing between layers
        "elk.spacing.nodeNode": "100", // Horizontal spacing between nodes in the same layer
        "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES", // Keep left-right order from the input
        "elk.layered.crossingMinimization.semiInteractive": "true", // Better crossing minimization
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX", // Better node placement
        "elk.layered.nodePlacement.favorStraightEdges": "true", // Minimize bends
        "elk.layered.layering.strategy": "NETWORK_SIMPLEX", // Better layer assignment
        "elk.layered.spacing.edgeNodeBetweenLayers": "20", // Spacing between edge and node
        "elk.layered.spacing.edgeEdgeBetweenLayers": "20", // Spacing between edges
        "elk.layered.nodePlacement.bk.fixedAlignment": "true", // Align nodes in layers precisely
        "elk.hierarchyHandling": "INCLUDE_CHILDREN", // Include child nodes
        "elk.edgeRouting": "ORTHOGONAL", // Orthogonal edge routing for straight lines
        "elk.layered.mergeEdges": "true", // Merge edges where possible for cleaner layout
        "elk.edges.slopeDiversity": "false", // Avoid varied edge slopes
        "elk.layered.wrapping.additionalEdgeSpacing": "40", // Additional edge spacing
        "elk.aspectRatio": "1.5", // Prefer wider layout
        "elk.edgeLabels.inline": "true", // Inline edge labels
        "elk.padding": "[50, 50, 50, 50]", // Padding around the entire layout
      },
      children: elkNodes,
      edges: elkEdges,
    };

    console.log("Configured ELK graph, calling layout engine");

    // Perform layout
    console.time("ELK layout calculation");
    const layoutedGraph = await elk.layout(elkGraph);
    console.timeEnd("ELK layout calculation");

    console.log("ELK layout completed, processing results");
    console.log("Layouted graph:", layoutedGraph);

    // Apply layout to original nodes
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      if (elkNode) {
        // ELK positions are absolute, React Flow uses top-left
        node.position = {
          x: elkNode.x || 0,
          y: elkNode.y || 0,
        };
      } else {
        console.warn(`No layout position found for node ${node.id}`);
      }
      return node;
    });

    // Create processed edges with adjusted handle positions
    const layoutedEdges = edges.map((edge) => {
      // Looking at the original components, the handles don't have specific IDs
      // ArticleNode uses "a" and "b" as handle IDs
      // QuestionNode doesn't specify IDs, so it uses default IDs

      return {
        ...edge,
        type: "smoothstep",
        // For article nodes the source handle is "b" (bottom)
        sourceHandle: edge.source.includes("article") ? "b" : undefined,
        // For article nodes the target handle is "a" (top)
        targetHandle: edge.target.includes("article") ? "a" : undefined,
      };
    });

    console.log("Layout processing complete, returning results");
    return { nodes: layoutedNodes, edges: layoutedEdges };
  } catch (error) {
    console.error("ELK layout error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw error; // Re-throw to be caught by the effect
  }
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
  const initialNodes: ExtendedNode[] = [
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
    // Additional questions for article-1-2 (Virtual DOM)
    {
      id: "question-1-2-3",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2-3",
        text: "How does batching updates improve performance in React?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-2-4",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2-4",
        text: "What are fiber nodes in React's reconciliation process?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-2-5",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2-5",
        text: "How does React handle component mounting and unmounting?",
        isImplicit: false,
      },
    },
    {
      id: "question-1-2-6",
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "question",
        id: "q1-2-6",
        text: "What is the difference between the Shadow DOM and Virtual DOM?",
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
    // New articles for the additional questions on article-1-2 (Virtual DOM)
    {
      id: "article-1-2-3",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Batching Updates in React",
        description:
          "Deep dive into how React batches state updates for better performance and the implications for your components.",
        status: "not-started",
      },
    },
    {
      id: "article-1-2-4",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "React Fiber Architecture",
        description:
          "Understanding the Fiber reconciliation engine that powers React's incremental rendering capabilities.",
        status: "not-started",
      },
    },
    {
      id: "article-1-2-5",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Component Lifecycle in React",
        description:
          "Comprehensive overview of how React handles component creation, updates, and removal in the DOM.",
        status: "not-started",
      },
    },
    {
      id: "article-1-2-6",
      type: "articleNode",
      position: { x: 0, y: 0 },
      data: {
        nodeType: "article",
        label: "Shadow DOM vs Virtual DOM",
        description:
          "A comparison of browser's native Shadow DOM technology and React's Virtual DOM approach to UI updates.",
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
    {
      id: "e1-1",
      source: "article-1",
      target: "question-1-1",
      animated: true,
    },
    {
      id: "e1-2",
      source: "article-1",
      target: "question-1-2",
      animated: true,
    },
    {
      id: "e1-3",
      source: "article-1",
      target: "question-1-3",
      animated: true,
    },

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
    // New edges for additional questions from article-1-2 (Virtual DOM)
    {
      id: "e1-10a",
      source: "article-1-2",
      target: "question-1-2-3",
      animated: true,
    },
    {
      id: "e1-10b",
      source: "article-1-2",
      target: "question-1-2-4",
      animated: true,
    },
    {
      id: "e1-10c",
      source: "article-1-2",
      target: "question-1-2-5",
      animated: true,
    },
    {
      id: "e1-10d",
      source: "article-1-2",
      target: "question-1-2-6",
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
    // New edges connecting the new questions to their articles
    {
      id: "e1-16a",
      source: "question-1-2-3",
      target: "article-1-2-3",
      animated: true,
    },
    {
      id: "e1-16b",
      source: "question-1-2-4",
      target: "article-1-2-4",
      animated: true,
    },
    {
      id: "e1-16c",
      source: "question-1-2-5",
      target: "article-1-2-5",
      animated: true,
    },
    {
      id: "e1-16d",
      source: "question-1-2-6",
      target: "article-1-2-6",
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
  const [nodes, setNodes] = React.useState<ExtendedNode[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [isLayouting, setIsLayouting] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Apply ELK layout on mount and when initialNodes/initialEdges change
  React.useEffect(() => {
    console.log("Starting layout effect");

    const applyLayout = async () => {
      setIsLayouting(true);
      setError(null);

      try {
        console.log("Applying ELK layout");
        const result = await getLayoutedElements(
          initialNodes,
          initialEdges,
          "DOWN" // Use DOWN direction for top-to-bottom layout
        );
        console.log("Layout completed successfully");
        setNodes(result.nodes);
        setEdges(result.edges);
      } catch (error) {
        console.error("Error in applyLayout:", error);
        setError(
          `Layout error: ${error instanceof Error ? error.message : String(error)}`
        );
        // Fallback to initial nodes and edges if layout fails
        setNodes(initialNodes);
        setEdges(initialEdges);
      } finally {
        console.log("Finishing layout, setting isLayouting to false");
        setIsLayouting(false);
      }
    };

    applyLayout();
  }, []); // Remove dependency on initialNodes/initialEdges since they're constant
  // --- End Use Layout ---

  const handleNodeClick = useCallback(
    (event: any, node: ExtendedNode) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        {isLayouting ? (
          <div className="flex items-center justify-center h-full">
            <p>Calculating optimal layout... {error && `Error: ${error}`}</p>
          </div>
        ) : (
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
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="#f0f0f0" gap={24} size={1} />
            <Controls />
          </ReactFlow>
        )}
      </ReactFlowProvider>
    </div>
  );
};

export default PersonalLearningMapFlow;
