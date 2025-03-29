import { useState, useEffect, useMemo } from "react";
import type { Node as ReactFlowNode, Edge } from "@xyflow/react";
import ELK from "elkjs";
import type { ElkNode, ElkExtendedEdge } from "elkjs";
import { Logger } from "@/lib/logger";

const log = new Logger({ context: "useElkLayout" });

// Constants for node dimensions
const ARTICLE_NODE_WIDTH = 350;
const ARTICLE_NODE_HEIGHT = 350;
const QUESTION_NODE_WIDTH = 200;
const QUESTION_NODE_HEIGHT = 100;

// Initialize ELK
const elk = new ELK();

// ELK layout options for optimal graph rendering
const elkLayoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "150",
  "elk.spacing.nodeNode": "100",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.crossingMinimization.semiInteractive": "true",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.nodePlacement.favorStraightEdges": "true",
  "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  "elk.layered.spacing.edgeNodeBetweenLayers": "20",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "20",
  "elk.layered.nodePlacement.bk.fixedAlignment": "true",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.mergeEdges": "true",
  "elk.edges.slopeDiversity": "false",
  "elk.layered.wrapping.additionalEdgeSpacing": "40",
  "elk.aspectRatio": "1.5",
  "elk.edgeLabels.inline": "true",
  "elk.padding": "[50, 50, 50, 50]",
};

interface ElkLayoutResult<
  NodeData extends Record<string, unknown>,
  EdgeData extends Record<string, unknown>,
> {
  nodes: ReactFlowNode<NodeData>[];
  edges: Edge<EdgeData>[];
  isLayouting: boolean;
  error: string | null;
}

function isQuestionNode(
  node: ReactFlowNode<Record<string, unknown>>
): node is ReactFlowNode<{ nodeType: "question"; [key: string]: unknown }> {
  return node.type === "questionNode";
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

  const direction = options?.direction ?? "DOWN";
  const layoutOptions = useMemo(
    () => ({
      ...elkLayoutOptions,
      "elk.direction": direction,
    }),
    [direction]
  );

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
        // Convert React Flow nodes to ELK format
        const elkNodes: ElkNode[] = initialNodes.map((node) => {
          const nodeWidth = isQuestionNode(
            node as ReactFlowNode<Record<string, unknown>>
          )
            ? QUESTION_NODE_WIDTH
            : ARTICLE_NODE_WIDTH;
          const nodeHeight = isQuestionNode(
            node as ReactFlowNode<Record<string, unknown>>
          )
            ? QUESTION_NODE_HEIGHT
            : ARTICLE_NODE_HEIGHT;

          return {
            id: node.id,
            width: nodeWidth,
            height: nodeHeight,
          };
        });

        // Convert React Flow edges to ELK format
        const elkEdges: ElkExtendedEdge[] = initialEdges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        }));

        const graphToLayout = {
          id: "root",
          layoutOptions: layoutOptions,
          children: elkNodes,
          edges: elkEdges,
        };

        log.debug("Configured ELK graph", graphToLayout);
        console.time("ELK layout calculation");

        const layoutedGraph = await elk.layout(graphToLayout);

        console.timeEnd("ELK layout calculation");
        log.debug("ELK layout calculation finished", layoutedGraph);

        if (isCancelled) {
          log.debug("Layout calculation cancelled, discarding results.");
          return;
        }

        const newNodes = initialNodes.map((node) => {
          const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
          if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
            return {
              ...node,
              position: { x: elkNode.x, y: elkNode.y },
              width: elkNode.width,
              height: elkNode.height,
            };
          } else {
            log.warn(`No layout position found for node ${node.id}`);
            return {
              ...node,
              position: node.position || { x: 0, y: 0 },
            };
          }
        });

        const newEdges = initialEdges.map((edge) => ({
          ...edge,
          type: "smoothstep",
          animated: edge.animated ?? true,
        }));

        setLayoutedNodes(newNodes);
        setLayoutedEdges(newEdges);
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
  }, [initialNodes, initialEdges, layoutOptions]);

  return { nodes: layoutedNodes, edges: layoutedEdges, isLayouting, error };
}
