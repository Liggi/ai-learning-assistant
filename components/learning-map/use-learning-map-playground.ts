import { useCallback } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import type { MapEdge, MapNode, QuestionNodeData } from "./types";

export function useLearningMapPlayground(flow: ReactFlowInstance) {
  const addQuestionNode = useCallback(
    (questionData: QuestionNodeData, sourceNodeId?: string) => {
      const id = `question-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const src = sourceNodeId
        ? flow.getNode(sourceNodeId)
        : flow.getNodes()[0];
      if (!src) {
        console.warn("No source node available for question positioning");
        return;
      }
      const newNode: MapNode = {
        id,
        type: "questionNode",
        position: { x: -9999, y: -9999 },
        data: { ...questionData, id },
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

  return { addQuestionNode, showHiddenNodes };
}
