import { ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { Article, UserQuestion } from "@/types/personal-learning-map";
import {
  ConversationNode as ConversationNodeType,
  ConversationEdge,
} from "@/types/conversation";
import ConversationNode from "./conversation-node";

const nodeTypes = {
  conversationNode: ConversationNode,
};

const defaultEdgeOptions = {
  style: {
    stroke: "rgba(148, 163, 184, 0.4)",
    strokeWidth: 1.5,
    strokeDasharray: "4 4",
  },
  animated: true,
  type: "smoothstep",
};

interface ConversationFlowProps {
  articles?: Article[];
  onNodeClick?: (text: string, nodeId: string) => void;
  selectedNodeId?: string | null;
  nodes?: ConversationNodeType[];
  edges?: ConversationEdge[];
}

function ConversationFlowInner({
  articles,
  onNodeClick,
  selectedNodeId,
  nodes,
  edges,
}: ConversationFlowProps) {
  const reactFlowInstance = useReactFlow();
  const initialZoomDone = useRef(false);

  // Use the nodes and edges from props directly
  const flowNodes = nodes || [];
  const flowEdges = edges || [];

  // Add debug logging
  console.log("Rendering Flow with:", {
    nodeCount: flowNodes.length,
    firstNode: flowNodes[0],
    edges: flowEdges.length,
  });

  // Refit view whenever nodes change
  useEffect(() => {
    if (!flowNodes.length) return;

    const timer = setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.4,
        duration: 400,
        minZoom: 0.2,
        maxZoom: 2,
      });
      initialZoomDone.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }, [flowNodes, reactFlowInstance]);

  // Zoom to selected node when it changes
  useEffect(() => {
    if (!selectedNodeId || !flowNodes.length || !initialZoomDone.current)
      return;

    const selectedNode = flowNodes.find((node) => node.id === selectedNodeId);
    if (selectedNode && selectedNode.position) {
      const { x, y } = selectedNode.position;

      // First fit view to show all nodes
      reactFlowInstance.fitView({
        padding: 0.4,
        duration: 400,
      });

      // Then center on the selected node
      setTimeout(() => {
        reactFlowInstance.setCenter(x, y, {
          zoom: 1.5,
          duration: 800,
        });
      }, 500);
    }
  }, [selectedNodeId, flowNodes, reactFlowInstance]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={flowNodes.map((node) => ({
          ...node,
          position: node.position || {
            x: 0,
            y: node.data.isUser ? 0 : 100,
          },
          selected: node.id === selectedNodeId,
          className: `node-${node.data.isUser ? "question" : "answer"}`,
          data: {
            ...node.data,
            // Ensure content has the correct structure
            content: node.data.content
              ? {
                  summary: node.data.content.summary,
                  takeaways: Array.isArray(node.data.content.takeaways)
                    ? node.data.content.takeaways
                    : [],
                }
              : undefined,
            onClick: (data: any) => onNodeClick?.(data.text, data.id),
          },
        }))}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={2}
        zoomOnScroll={true}
        onNodeMouseEnter={() => {}}
        onNodeMouseLeave={() => {}}
      />
    </div>
  );
}

export default function ConversationFlow({
  articles,
  onNodeClick,
  selectedNodeId,
  nodes,
  edges,
}: ConversationFlowProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <ConversationFlowInner
          articles={articles}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
          nodes={nodes}
          edges={edges}
        />
      </ReactFlowProvider>
    </div>
  );
}
