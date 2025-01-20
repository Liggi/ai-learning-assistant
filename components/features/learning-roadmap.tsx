import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import { NodeData } from "@/components/chat-screen";
import Node from "@/components/react-flow/node";
import ConversationNode from "../conversation-node";

const nodeTypes = { normalNode: Node, conversationNode: ConversationNode };

const handleNodeClick = (node: ReactFlowNode<NodeData>) => {
  console.log("Node clicked:", node.id);
};

function FlowWithProvider({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: ReactFlowNode<NodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<NodeData>) => void;
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      onNodeClick={(_, node) => onNodeClick(node)}
    ></ReactFlow>
  );
}

export default function LearningRoadmap({
  roadmap,
}: {
  roadmap: { nodes: ReactFlowNode<NodeData>[]; edges: ReactFlowEdge[] };
}) {
  return (
    <ReactFlowProvider>
      <FlowWithProvider
        nodes={roadmap.nodes}
        edges={roadmap.edges}
        onNodeClick={handleNodeClick}
      />
    </ReactFlowProvider>
  );
}
