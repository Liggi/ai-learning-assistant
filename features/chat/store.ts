import { create } from "zustand";
import { Node, Edge } from "@xyflow/react";

interface LearningContent {
  summary: string;
  takeaways: string[];
}

export interface Message {
  id?: string;
  text: string;
  isUser: boolean;
  content?: LearningContent;
  parentId?: string; // Track which message this is responding to
}

export interface ConversationNodeData extends Record<string, unknown> {
  id: string;
  text: string;
  content?: LearningContent;
  summary: string;
  isUser: boolean;
}

interface ConversationState {
  messages: Message[];
  nodes: Node<ConversationNodeData>[];
  edges: Edge[];
  activeNodeId: string | null;
  nodeHeights: Record<string, number>; // Map of node ID to its height
  addMessage: (message: Message) => void;
  setNodes: (nodes: Node<ConversationNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setActiveNode: (nodeId: string) => void;
  setNodeHeight: (nodeId: string, height: number) => void;
}

// Constants for layout
const VERTICAL_SPACING = 60; // Space between the bottom of one node and top of the next
const HORIZONTAL_SPACING = 400; // Space between columns
const START_X = 100; // Starting X position
const START_Y = 100; // Starting Y position
const DEFAULT_NODE_HEIGHT = 150; // Default height if not measured yet

// Tree node interface used for computing a tree layout
interface TreeNode {
  message: Message;
  children: TreeNode[];
  position?: { x: number; y: number };
}

// Helper function to create an edge between two nodes
const createEdge = (sourceId: string, targetId: string): Edge => ({
  id: `e${sourceId}-${targetId}`,
  source: sourceId,
  target: targetId,
  type: "smoothstep",
  style: { stroke: "rgba(148, 163, 184, 0.2)", strokeWidth: 2 },
  animated: true,
});

// Helper function to convert a message to a conversation node
const messageToNode = (
  message: Message,
  position: { x: number; y: number }
): Node<ConversationNodeData> => ({
  id: message.id!,
  type: "conversationNode",
  position,
  data: {
    id: message.id!,
    text: message.text,
    content: message.content,
    summary: message.content?.summary || message.text,
    isUser: message.isUser,
  },
});

// Compute tree layout from messages and return nodes and edges arrays
const computeTreeLayout = (
  messages: Message[],
  nodeHeights: Record<string, number>
): { nodes: Node<ConversationNodeData>[]; edges: Edge[] } => {
  // Build tree nodes map, keyed by message id.
  const nodeMap: { [key: string]: TreeNode } = {};
  const roots: TreeNode[] = [];

  messages.forEach((msg) => {
    const id = msg.id || `${Date.now()}-${Math.random()}`;
    msg.id = id; // assign an id if missing
    const treeNode: TreeNode = { message: msg, children: [] };
    nodeMap[id] = treeNode;

    // If there's an explicit parent ID, use that
    if (msg.parentId && nodeMap[msg.parentId]) {
      nodeMap[msg.parentId].children.push(treeNode);
    } else {
      // If no parent ID, this is a root node
      roots.push(treeNode);
    }
  });

  // Assign positions using a simple tree layout algorithm.
  let currentLeaf = 0;
  function assignPositions(
    node: TreeNode,
    depth: number,
    accumulatedY: number
  ): number {
    const x =
      node.children.length === 0
        ? START_X + currentLeaf++ * HORIZONTAL_SPACING
        : (() => {
            const childrenXPositions = node.children.map((child) =>
              assignPositions(
                child,
                depth + 1,
                accumulatedY +
                  (nodeHeights[node.message.id!] || DEFAULT_NODE_HEIGHT) +
                  VERTICAL_SPACING
              )
            );
            return (
              (Math.min(...childrenXPositions) +
                Math.max(...childrenXPositions)) /
              2
            );
          })();

    node.position = {
      x,
      y: accumulatedY,
    };

    return x;
  }

  // Assign positions for all root nodes.
  let currentY = START_Y;
  roots.forEach((root) => {
    assignPositions(root, 0, currentY);
    currentY +=
      (nodeHeights[root.message.id!] || DEFAULT_NODE_HEIGHT) + VERTICAL_SPACING;
  });

  // Flatten the tree into nodes and edges arrays.
  const computedNodes: Node<ConversationNodeData>[] = [];
  const computedEdges: Edge[] = [];

  function flattenTree(node: TreeNode) {
    computedNodes.push(messageToNode(node.message, node.position!));

    node.children.forEach((child) => {
      computedEdges.push(createEdge(node.message.id!, child.message.id!));
      flattenTree(child);
    });
  }
  roots.forEach((root) => flattenTree(root));

  return { nodes: computedNodes, edges: computedEdges };
};

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  nodes: [],
  edges: [],
  activeNodeId: null,
  nodeHeights: {},
  addMessage: (message) =>
    set((state) => {
      // If this is a user message and we have an active node that's not a user message,
      // set the parent ID to the active node
      if (message.isUser && state.activeNodeId) {
        const activeMessage = state.messages.find(
          (m) => m.id === state.activeNodeId
        );
        if (activeMessage && !activeMessage.isUser) {
          message.parentId = state.activeNodeId;
        }
      }

      const newMessages = [...state.messages, message];
      const { nodes: newNodes, edges: newEdges } = computeTreeLayout(
        newMessages,
        state.nodeHeights
      );
      return {
        messages: newMessages,
        nodes: newNodes,
        edges: newEdges,
      };
    }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
  setNodeHeight: (nodeId, height) =>
    set((state) => {
      // Only update if height actually changed
      if (state.nodeHeights[nodeId] === height) {
        return state;
      }

      const newNodeHeights = { ...state.nodeHeights, [nodeId]: height };
      const { nodes: newNodes, edges: newEdges } = computeTreeLayout(
        state.messages,
        newNodeHeights
      );

      return {
        nodeHeights: newNodeHeights,
        nodes: newNodes,
        edges: newEdges,
      };
    }),
}));
