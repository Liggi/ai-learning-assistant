import { ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useConversationStore, Message } from "@/features/chat/store";
import ConversationNode from "./conversation-node";
import { useEffect } from "react";

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
  conversation: Message[];
  onNodeClick?: (text: string, nodeId: string) => void;
  selectedNodeId?: string | null;
}

function ConversationFlowInner({
  conversation,
  onNodeClick,
  selectedNodeId,
}: ConversationFlowProps) {
  const { nodes, edges } = useConversationStore((state) => ({
    nodes: state.nodes,
    edges: state.edges,
  }));
  const { fitView } = useReactFlow();

  // Add debug logging
  console.log("Rendering Flow with:", {
    nodeCount: nodes.length,
    firstNode: nodes[0],
    edges: edges.length,
  });

  // Refit view whenever nodes change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({
        padding: 0.4,
        duration: 400,
        minZoom: 0.6,
        maxZoom: 1.2,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes, fitView]);

  return (
    <ReactFlow
      nodes={nodes.map((node) => ({
        ...node,
        position: node.position || {
          x: 0,
          y: node.data.isUser ? 0 : 100,
        },
        selected: node.id === selectedNodeId,
        className: `node-${node.data.isUser ? "question" : "answer"}`,
        style: {
          width: 320,
          padding: "16px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        },
        data: {
          ...node.data,
          onClick: (data: any) => onNodeClick?.(data.text, data.id),
        },
      }))}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.4 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={0.6}
      maxZoom={1.2}
      zoomOnScroll={false}
      onNodeMouseEnter={() => {}}
      onNodeMouseLeave={() => {}}
    />
  );
}

export default function ConversationFlow(props: ConversationFlowProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <ConversationFlowInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
