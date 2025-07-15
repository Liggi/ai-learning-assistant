import { useCallback } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import type { MapEdge, MapNode, QuestionNodeData, ArticleNodeData, NodeCreationOptions } from "./types";

export function useLearningMapPlayground(flow: ReactFlowInstance) {
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
        style: { opacity: 0, pointerEvents: "none" as const },
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
        style: { opacity: 0 },
      } as MapEdge;
      
      flow.addNodes([newNode]);
      flow.addEdges([newEdge]);
    },
    [flow]
  );


  const showHiddenNodes = useCallback(() => {
    const nodes = flow
      .getNodes()
      .map((n) =>
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

  return { addNode, showHiddenNodes };
}
