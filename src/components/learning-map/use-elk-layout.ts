import { useCallback, useMemo, useRef, useEffect } from "react";
import { ReactFlowInstance, useNodesInitialized } from "@xyflow/react";
import { calculateElkLayout } from "@/services/layouts/elk";
import { hasFinalPosition } from "./has-final-position";
import type { MapEdge, MapNode } from "./types";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "ElkLayout", enabled: false });

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
    logger.info("runLayout called", {
      nodesInitialized,
      allNodesReady,
      isLayouting: isLayouting.current
    });

    if (!nodesInitialized || !allNodesReady || isLayouting.current) {
      logger.info("Skipping layout", {
        reason: !nodesInitialized ? "nodes not initialized" : !allNodesReady ? "nodes not ready" : "already layouting"
      });
      return;
    }

    const currentNodes = flow.getNodes();
    const currentEdges = flow.getEdges();

    logger.info("Layout input", {
      currentNodesCount: currentNodes.length,
      currentNodes: JSON.stringify(currentNodes.map(n => ({ id: n.id, type: n.type, position: n.position, finalPosition: n.finalPosition, opacity: n.style?.opacity }))),
      currentEdgesCount: currentEdges.length,
      currentEdges: JSON.stringify(currentEdges.map(e => ({ id: e.id, source: e.source, target: e.target })))
    });

    const layoutNodes = currentNodes.map((node) => {
      // Only use finalPosition for hidden nodes or nodes that haven't been positioned
      if (hasFinalPosition(node) && node.finalPosition && node.style?.opacity === 0) {
        logger.info("Using finalPosition for hidden node", {
          nodeId: node.id,
          currentPosition: JSON.stringify(node.position),
          finalPosition: JSON.stringify(node.finalPosition)
        });
        return { ...node, position: node.finalPosition };
      }
      return node; // Use current position for visible nodes
    });

    logger.info("Layout nodes prepared", {
      layoutNodes: JSON.stringify(layoutNodes.map(n => ({ id: n.id, type: n.type, position: n.position, opacity: n.style?.opacity })))
    });

    const oldPos = new Map(layoutNodes.map((n) => [n.id, { ...n.position }]));

    isLayouting.current = true;
    logger.info("Starting ELK layout calculation");
    const res = await calculateElkLayout(layoutNodes, currentEdges);
    isLayouting.current = false;
    
    logger.info("ELK layout completed", {
      success: !!res,
      resultNodes: res ? JSON.stringify(res.nodes.map(n => ({ id: n.id, position: n.position }))) : null,
      resultEdges: res ? JSON.stringify(res.edges.map(e => ({ id: e.id, source: e.source, target: e.target }))) : null
    });
    
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
      else {
        logger.info("Layout animation completed, calling onLayoutComplete", {
          finalNodes: JSON.stringify(nodes.map(n => ({ id: n.id, position: n.position }))),
          finalEdges: JSON.stringify(currentEdges.map(e => ({ id: e.id, source: e.source, target: e.target })))
        });
        if (onLayoutComplete)
          onLayoutComplete(nodes as MapNode[], currentEdges as MapEdge[]);
      }
    };
    requestAnimationFrame(animate);
  }, [nodesInitialized, allNodesReady, flow, onLayoutComplete]);

  // Auto-trigger layout when nodes are ready
  useEffect(() => {
    logger.info("Auto-trigger layout effect", {
      nodesInitialized,
      allNodesReady,
      willTrigger: nodesInitialized && allNodesReady
    });
    if (nodesInitialized && allNodesReady) {
      logger.info("Auto-triggering layout");
      runLayout();
    }
  }, [nodesInitialized, allNodesReady, runLayout]);

  return runLayout;
}
