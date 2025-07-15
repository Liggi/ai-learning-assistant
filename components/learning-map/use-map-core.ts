import { useCallback, useRef } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import { useElkLayout } from "./use-elk-layout";
import type {
  MapEdge,
  MapNode,
  NodeCreationOptions,
  NodeReplacementOptions,
} from "./types";

export function useMapCore(
  flow: ReactFlowInstance,
  onLayoutComplete?: (nodes: MapNode[], edges: MapEdge[]) => void
) {
  const newlyAddedNodeId = useRef<string | null>(null);
  const hasCompletedFirstLayout = useRef<boolean>(false);

  const handleLayoutComplete = useCallback(
    (nodes: MapNode[], edges: MapEdge[]) => {
      // If this is the first layout, show all nodes and edges
      if (!hasCompletedFirstLayout.current) {
        const updatedNodes = flow.getNodes().map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            pointerEvents: "auto" as const,
            transition: "opacity 0.5s ease-in-out",
          },
        }));
        const updatedEdges = flow.getEdges().map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            opacity: 1,
            transition: "opacity 0.5s ease-in-out",
          },
        }));
        flow.setNodes(updatedNodes);
        flow.setEdges(updatedEdges);
        hasCompletedFirstLayout.current = true;
      }
      // Show the newly added node after layout completes
      else if (newlyAddedNodeId.current) {
        const updatedNodes = flow.getNodes().map((node) =>
          node.id === newlyAddedNodeId.current
            ? {
                ...node,
                style: {
                  ...node.style,
                  opacity: 1,
                  pointerEvents: "auto" as const,
                  transition: "opacity 0.5s ease-in-out",
                },
              }
            : node
        );
        const updatedEdges = flow.getEdges().map((edge) =>
          edge.target === newlyAddedNodeId.current
            ? {
                ...edge,
                style: {
                  ...edge.style,
                  opacity: 1,
                  transition: "opacity 0.5s ease-in-out",
                },
              }
            : edge
        );
        flow.setNodes(updatedNodes);
        flow.setEdges(updatedEdges);

        newlyAddedNodeId.current = null;
      }

      // Call the original callback if provided
      if (onLayoutComplete) {
        onLayoutComplete(nodes, edges);
      }
    },
    [flow, onLayoutComplete]
  );

  const runLayout = useElkLayout(flow, handleLayoutComplete);

  const addNode = useCallback(
    (options: NodeCreationOptions) => {
      const { type, data, sourceNodeId } = options;
      const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const nodes = flow.getNodes();
      const src = sourceNodeId
        ? flow.getNode(sourceNodeId)
        : nodes[nodes.length - 1] || nodes[0];

      if (!src) {
        console.warn("No source node available for node positioning");
        return;
      }

      const newNode: MapNode = {
        id,
        type: type === "question" ? "questionNode" : "articleNode",
        position: { x: -9999, y: -9999 },
        data: { ...data, id },
        style: {
          opacity: 0,
          pointerEvents: "none" as const,
          transition: "opacity 0.5s ease-in-out",
        },
        finalPosition: {
          x: src.position.x + 200,
          y: src.position.y + 100,
        },
      } as MapNode;

      const newEdge: MapEdge = {
        id: `${src.id}-${id}`,
        source: src.id,
        target: id,
        type: "smoothstep",
        animated: false,
        style: {
          opacity: 0,
          transition: "opacity 0.5s ease-in-out",
        },
      } as MapEdge;

      flow.addNodes([newNode]);
      flow.addEdges([newEdge]);

      // Track the newly added node for auto-show after layout
      newlyAddedNodeId.current = id;
    },
    [flow, runLayout]
  );

  const replaceNode = useCallback(
    (options: NodeReplacementOptions) => {
      const { id, newNode } = options;

      const node = flow.getNode(id);

      if (!node) {
        console.warn("Node not found");
        return;
      }

      flow.updateNode(id, newNode, { replace: true });
    },
    [flow]
  );

  const showHiddenNodes = useCallback(() => {
    const nodes = flow.getNodes().map((n) =>
      n.style?.opacity === 0
        ? {
            ...n,
            style: { ...n.style, opacity: 1, pointerEvents: "auto" as const },
          }
        : n
    );
    const edges = flow
      .getEdges()
      .map((e) =>
        e.style?.opacity === 0 ? { ...e, style: { ...e.style, opacity: 1 } } : e
      );
    flow.setNodes(nodes);
    flow.setEdges(edges);
  }, [flow]);

  return { addNode, replaceNode, showHiddenNodes, runLayout };
}
