import ELK from "elkjs";
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from "elkjs";
import type { Node as ReactFlowNode, Edge } from "@xyflow/react";
import { Logger } from "@/lib/logger";

const log = new Logger({ context: "calculateElkLayout" });

// Base ELK layout options
const baseElkLayoutOptions: LayoutOptions = {
  "elk.algorithm": "layered",
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

// Initialize ELK
const elk = new ELK();

interface MeasuredNode extends ReactFlowNode {
  measured?: {
    width?: number;
    height?: number;
  };
}

export interface CalculateLayoutOptions {
  direction?: "UP" | "DOWN" | "LEFT" | "RIGHT";
  // Add any other specific options you might want to pass
}

/**
 * Calculates layout for React Flow nodes and edges using ELK.js,
 * utilizing pre-measured node dimensions.
 *
 * @param nodes Nodes with measured dimensions (width/height).
 * @param edges The edges connecting the nodes.
 * @param options Layout configuration options.
 * @returns A promise resolving to the layouted ELK graph.
 */
export async function calculateElkLayout(
  nodes: MeasuredNode[],
  edges: Edge[],
  options?: CalculateLayoutOptions
): Promise<ElkNode> {
  const layoutOptions = {
    ...baseElkLayoutOptions,
    "elk.direction": options?.direction ?? "DOWN",
  };

  log.debug(
    `Calculating layout for ${nodes.length} nodes and ${edges.length} edges with direction ${layoutOptions["elk.direction"]}`
  );

  // Convert React Flow nodes to ELK format, using measured dimensions
  const elkNodes: ElkNode[] = nodes.map((node) => {
    // Use measured dimensions if available, otherwise fallback (though should be available)
    const width = node.measured?.width ?? 300; // Fallback width
    const height = node.measured?.height ?? 300; // Fallback height

    if (!node.measured?.width || !node.measured?.height) {
      log.warn(
        `Node ${node.id} missing measured dimensions. Using fallback: ${width}x${height}`
      );
    }

    return {
      id: node.id,
      width: width,
      height: height,
    };
  });

  // Convert React Flow edges to ELK format
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graphToLayout: ElkNode = {
    id: "root",
    layoutOptions: layoutOptions,
    children: elkNodes,
    edges: elkEdges,
  };

  log.debug("Configured ELK graph for layout", graphToLayout);
  console.time("ELK layout calculation");

  try {
    const layoutedGraph = await elk.layout(graphToLayout);
    console.timeEnd("ELK layout calculation");
    log.debug("ELK layout calculation finished", layoutedGraph);
    return layoutedGraph;
  } catch (error) {
    console.timeEnd("ELK layout calculation"); // Ensure timer ends on error
    log.error("ELK layout error", error);
    throw error; // Re-throw the error to be caught by the caller
  }
}
