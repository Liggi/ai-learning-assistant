import { ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useConversationStore } from "@/features/chat/store";
import { Message } from "@/features/chat/chat-service";
import ConversationNode from "./conversation-node";
import { useEffect } from "react";
import { LayoutGrid } from "lucide-react";

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
  const nodes = useConversationStore((state) => state.nodes);
  const edges = useConversationStore((state) => state.edges);
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
        minZoom: 0.2,
        maxZoom: 2,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes, fitView]);

  return (
    <div className="relative w-full h-full">
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
  conversation,
  onNodeClick,
  selectedNodeId,
}: ConversationFlowProps) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <ConversationFlowInner
          conversation={conversation}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      </ReactFlowProvider>
    </div>
  );
}
