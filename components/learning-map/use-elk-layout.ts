import { useCallback, useMemo, useRef } from "react";
import { ReactFlowInstance, useNodesInitialized } from "@xyflow/react";
import { calculateElkLayout } from "@/services/layouts/elk";
import { hasFinalPosition } from "./has-final-position";
import type { MapEdge, MapNode } from "./types";

const ANIMATION_DURATION_MS = 500;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

export function useElkLayout(
  flow: ReactFlowInstance,
  onLayoutComplete?: (nodes: MapNode[], edges: MapEdge[]) => void
) {
  const nodesInitialized = useNodesInitialized();
  const isLayouting = useRef(false);

  const allNodesReady = useMemo(() => {
    const nodes = flow.getNodes();
    return (
      nodes.length > 0 &&
      nodes.every((n) => n.measured?.width && n.measured?.height)
    );
  }, [flow, nodesInitialized]);

  const runLayout = useCallback(async () => {
    if (!nodesInitialized || !allNodesReady || isLayouting.current) return;

    const currentNodes = flow.getNodes();
    const currentEdges = flow.getEdges();

    const layoutNodes = currentNodes.map((node) => {
      // Only use finalPosition for hidden nodes or nodes that haven't been positioned
      if (hasFinalPosition(node) && node.finalPosition && node.style?.opacity === 0) {
        return { ...node, position: node.finalPosition };
      }
      return node; // Use current position for visible nodes
    });

    const oldPos = new Map(layoutNodes.map((n) => [n.id, { ...n.position }]));

    isLayouting.current = true;
    const res = await calculateElkLayout(layoutNodes, currentEdges);
    isLayouting.current = false;
    if (!res) return;

    flow.setEdges(res.edges as MapEdge[]);

    const start = Date.now();
    const animate = () => {
      const t = Math.min((Date.now() - start) / ANIMATION_DURATION_MS, 1);
      const eased = easeInOut(t);
      const nodes = res.nodes.map((newNode) => {
        const o = oldPos.get(newNode.id);
        if (!o) return newNode;
        return {
          ...newNode,
          position: {
            x: o.x + (newNode.position.x - o.x) * eased,
            y: o.y + (newNode.position.y - o.y) * eased,
          },
        };
      });
      flow.setNodes(nodes);
      if (t < 1) requestAnimationFrame(animate);
      else if (onLayoutComplete)
        onLayoutComplete(nodes as MapNode[], currentEdges as MapEdge[]);
    };
    requestAnimationFrame(animate);
  }, [nodesInitialized, allNodesReady, flow, onLayoutComplete]);

  return runLayout;
}
