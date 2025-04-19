import ELK from "elkjs";
import type { Node as FlowNode, Edge } from "@xyflow/react";
import type { ElkNode, ElkExtendedEdge } from "elkjs";

const ARTICLE_NODE_WIDTH = 350;
const ARTICLE_NODE_HEIGHT = 350;
const QUESTION_NODE_WIDTH = 200;
const QUESTION_NODE_HEIGHT = 100;

const elkLayoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "150",
  "elk.spacing.nodeNode": "100",
  "elk.edgeRouting": "ORTHOGONAL",
};

const elk = new ELK();

export interface MeasuredNode<T extends Record<string, unknown>>
  extends FlowNode<T> {
  measured?: {
    width?: number;
    height?: number;
  };
}

/**
 * Calculates layout for React Flow nodes and edges using ELK.js.
 */
export async function calculateElkLayout<
  NodeData extends Record<string, unknown>,
  EdgeData extends Record<string, unknown>,
>(
  initialNodes: MeasuredNode<NodeData>[],
  initialEdges: Edge<EdgeData>[],
  options?: { direction?: "UP" | "DOWN" | "LEFT" | "RIGHT" }
): Promise<{
  nodes: FlowNode<NodeData>[];
  edges: Edge<EdgeData>[];
} | null> {
  const direction = options?.direction ?? "DOWN";
  const layoutOptions = { ...elkLayoutOptions, "elk.direction": direction };

  // Bail if any node is missing measured dimensions
  if (
    !initialNodes.every(
      (node) => node.measured?.width != null && node.measured?.height != null
    )
  ) {
    return null;
  }
  // All nodes are measured
  const measuredNodes = initialNodes;
  const filteredEdges = initialEdges;

  // Build ELK graph using only measured nodes
  const elkNodes: ElkNode[] = measuredNodes.map((node) => {
    const width =
      node.measured?.width ??
      (node.type === "questionNode" ? QUESTION_NODE_WIDTH : ARTICLE_NODE_WIDTH);
    const height =
      node.measured?.height ??
      (node.type === "questionNode"
        ? QUESTION_NODE_HEIGHT
        : ARTICLE_NODE_HEIGHT);

    return { id: node.id, width, height };
  });

  const elkEdges: ElkExtendedEdge[] = filteredEdges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graphToLayout = {
    id: "root",
    layoutOptions,
    children: elkNodes,
    edges: elkEdges,
  };

  const layoutedGraph = await elk.layout(graphToLayout);

  // Remap ELK output back into React Flow nodes & edges, for measured nodes only
  const newNodes: FlowNode<NodeData>[] = measuredNodes.map((node) => {
    // Exclude measured when spreading to match FlowNode
    const { measured, ...nodeRest } = node;
    const elkNode = layoutedGraph.children?.find((n) => n.id === nodeRest.id);
    const position =
      elkNode?.x != null && elkNode?.y != null
        ? { x: elkNode.x, y: elkNode.y }
        : nodeRest.position;
    const width = elkNode?.width ?? nodeRest.width;
    const height = elkNode?.height ?? nodeRest.height;
    return {
      ...nodeRest,
      position,
      width,
      height,
    };
  });

  const newEdges = filteredEdges.map((edge) => ({
    ...edge,
    type: "smoothstep",
    animated: edge.animated ?? true,
  }));

  return { nodes: newNodes, edges: newEdges };
}
