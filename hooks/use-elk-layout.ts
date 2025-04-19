import { useState, useEffect } from "react";
import type { Node as ReactFlowNode, Edge } from "@xyflow/react";
import { calculateElkLayout } from "@/services/layouts/elk";
import { Logger } from "@/lib/logger";

const log = new Logger({ context: "useElkLayout" });

interface ElkLayoutResult<
  NodeData extends Record<string, unknown>,
  EdgeData extends Record<string, unknown>,
> {
  nodes: ReactFlowNode<NodeData>[];
  edges: Edge<EdgeData>[];
  isLayouting: boolean;
  error: string | null;
}

/**
 * Calculates layout for React Flow nodes and edges using ELK.js.
 */
export function useElkLayout<
  NodeData extends Record<string, unknown>,
  EdgeData extends Record<string, unknown>,
>(
  initialNodes: ReactFlowNode<NodeData>[],
  initialEdges: Edge<EdgeData>[],
  options?: { direction?: "UP" | "DOWN" | "LEFT" | "RIGHT" }
): ElkLayoutResult<NodeData, EdgeData> {
  const [layoutedNodes, setLayoutedNodes] = useState<ReactFlowNode<NodeData>[]>(
    []
  );
  const [layoutedEdges, setLayoutedEdges] = useState<Edge<EdgeData>[]>([]);
  const [isLayouting, setIsLayouting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialNodes || initialNodes.length === 0) {
      log.debug("No initial nodes provided, skipping layout.");
      setLayoutedNodes([]);
      setLayoutedEdges([]);
      setIsLayouting(false);
      setError(null);
      return;
    }

    log.debug("Starting ELK layout calculation effect.");
    let isCancelled = false;

    const performLayout = async () => {
      setIsLayouting(true);
      setError(null);
      setLayoutedNodes([]);
      setLayoutedEdges([]);

      try {
        // Delegate to the pure ELK service
        const result = await calculateElkLayout(
          initialNodes,
          initialEdges,
          options
        );
        if (!isCancelled) {
          if (result === null) {
            // Abort layout if measurements missing
            setError("Layout aborted: missing measurements");
            setLayoutedNodes([]);
            setLayoutedEdges([]);
          } else {
            setLayoutedNodes(result.nodes);
            setLayoutedEdges(result.edges);
          }
        }
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "An unknown error occurred";
        log.error("ELK layout error", e);
        setError(`Layout failed: ${errorMessage}`);
        if (!isCancelled) {
          setLayoutedNodes(initialNodes);
          setLayoutedEdges(initialEdges);
        }
      } finally {
        if (!isCancelled) {
          setIsLayouting(false);
        }
      }
    };

    performLayout();

    return () => {
      isCancelled = true;
    };
  }, [initialNodes, initialEdges, options]);

  return { nodes: layoutedNodes, edges: layoutedEdges, isLayouting, error };
}
