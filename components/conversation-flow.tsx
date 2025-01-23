import { ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useConversationStore } from "@/resources/chat/chat";
import ConversationNode from "./conversation-node";
import { useEffect } from "react";

const nodeTypes = {
  conversationNode: ConversationNode,
};

const defaultEdgeOptions = {
  style: {
    stroke: "rgba(148, 163, 184, 0.2)",
    strokeWidth: 2,
    strokeDasharray: "5 5",
  },
  animated: true,
  type: "smoothstep",
};

interface ConversationFlowProps {
  onNodeClick?: (text: string, nodeId: string) => void;
  selectedNodeId?: string | null;
}

function ConversationFlowInner({
  onNodeClick,
  selectedNodeId,
}: ConversationFlowProps) {
  const { nodes, edges } = useConversationStore();
  const { fitView } = useReactFlow();

  // Refit view whenever nodes change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 50); // Small delay to ensure nodes have been positioned
    return () => clearTimeout(timer);
  }, [nodes, fitView]);

  return (
    <ReactFlow
      nodes={nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          onClick: (data: any) => onNodeClick?.(data.text, data.id),
        },
      }))}
      edges={edges}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={0.5}
      maxZoom={1.5}
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
