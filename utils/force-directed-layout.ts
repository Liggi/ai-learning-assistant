import * as d3 from "d3-force";
import type {
  SerializedArticle,
  SerializedQuestion,
} from "../types/serialized";
import type { Node, Edge } from "reactflow";

export interface ForceNode {
  id: string;
  type: "conversationNode" | "questionNode";
  width: number;
  height: number;
  x?: number;
  y?: number;
  fx?: number; // fixed x position (for pinned nodes)
  fy?: number; // fixed y position (for pinned nodes)
  data: any;
}

// Configuration options for the force layout
export interface ForceLayoutOptions {
  linkDistance?: number; // Distance between connected nodes
  chargeStrength?: number; // Repulsion between nodes
  collisionPadding?: number; // Extra padding to prevent overlaps
  centerStrength?: number; // Strength of centering force
  iterations?: number; // Simulation iterations
  initialPositions?: Record<string, { x: number; y: number }>; // Use existing positions
  activeArticleId?: string; // Currently active article ID
}

// Default dimensions for node types
const NODE_DIMENSIONS = {
  conversationNode: { width: 350, height: 200 },
  questionNode: { width: 200, height: 120 },
};

/**
 * Compute a force-directed layout for articles and questions
 * Uses d3-force to create a physics-based layout where:
 * - Connected nodes pull each other closer (spring forces)
 * - All nodes repel each other (charge forces)
 * - Collision detection prevents overlapping
 */
export function computeForceLayout(
  articles: SerializedArticle[],
  questions: SerializedQuestion[],
  options: ForceLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  if (articles.length === 0 && questions.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Default options
  const config = {
    linkDistance: 300,
    chargeStrength: -1000,
    collisionPadding: 50,
    centerStrength: 0.1,
    iterations: 500,
    initialPositions: {},
    activeArticleId: undefined,
    ...options,
  };

  // Convert articles and questions to force nodes
  const forceNodes: ForceNode[] = [
    ...articles.map((article) => ({
      id: article.id,
      type: "conversationNode" as const,
      width: NODE_DIMENSIONS.conversationNode.width,
      height: NODE_DIMENSIONS.conversationNode.height,
      // Use stored position if available
      ...(article.positionX !== null && article.positionY !== null
        ? { x: article.positionX, y: article.positionY }
        : {}),
      data: {
        id: article.id,
        content: {
          summary: article.summary || "",
          takeaways: article.takeaways || [],
        },
        isUser: false,
        isLoading: false,
        isActive: article.id === config.activeArticleId,
      },
    })),
    ...questions.map((question) => ({
      id: question.id,
      type: "questionNode" as const,
      width: NODE_DIMENSIONS.questionNode.width,
      height: NODE_DIMENSIONS.questionNode.height,
      // Use stored position if available
      ...(question.positionX !== null && question.positionY !== null
        ? { x: question.positionX, y: question.positionY }
        : {}),
      data: {
        id: question.id,
        text: question.text,
        isImplicit: false,
      },
    })),
  ];

  // Create links between nodes
  const forceLinks: {
    id: string;
    source: string;
    target: string;
  }[] = [
    // Links from articles to their questions
    ...articles.flatMap((article) =>
      article.questions.map((question) => ({
        id: `${article.id}-${question.id}`,
        source: article.id,
        target: question.id,
      }))
    ),
    // Links from questions to their destination articles
    ...questions
      .filter((q) => q.destinationArticleId)
      .map((question) => ({
        id: `${question.id}-${question.destinationArticleId}`,
        source: question.id,
        target: question.destinationArticleId!,
      })),
  ];

  // For nodes with existing positions, fix them initially to help stabilize layout
  forceNodes.forEach((node) => {
    if (node.x !== undefined && node.y !== undefined) {
      node.fx = node.x;
      node.fy = node.y;
    }
  });

  // Create the simulation
  const simulation = d3
    .forceSimulation(forceNodes as any)
    // Links pull connected nodes together
    .force(
      "link",
      d3
        .forceLink(forceLinks)
        .id((d: any) => d.id)
        .distance(config.linkDistance)
    )
    // Nodes repel each other
    .force("charge", d3.forceManyBody().strength(config.chargeStrength))
    // Keep the graph centered
    .force("center", d3.forceCenter(0, 0).strength(config.centerStrength))
    // Prevent nodes from overlapping based on their dimensions
    .force(
      "collision",
      d3
        .forceCollide()
        .radius(
          (d: any) =>
            Math.sqrt(Math.pow(d.width / 2, 2) + Math.pow(d.height / 2, 2)) +
            config.collisionPadding
        )
    );

  // Run the simulation to completion
  for (let i = 0; i < config.iterations; i++) {
    simulation.tick();
  }

  // Release fixed positions after layout is calculated
  forceNodes.forEach((node) => {
    node.fx = undefined;
    node.fy = undefined;
  });

  // Convert to ReactFlow format
  const nodes: Node[] = forceNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: {
      x: node.x || 0,
      y: node.y || 0,
    },
    data: {
      ...node.data,
      isActive: node.id === config.activeArticleId,
    },
  }));

  const edges: Edge[] = forceLinks.map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
    type: "smoothstep",
  }));

  // Add specialized positioning for questions around their articles
  return positionQuestionsAroundArticles(nodes, edges, articles, questions);
}

/**
 * Position questions in a semi-circle around their source articles
 * This creates a more organized layout for question nodes
 */
function positionQuestionsAroundArticles(
  nodes: Node[],
  edges: Edge[],
  articles: SerializedArticle[],
  questions: SerializedQuestion[]
): { nodes: Node[]; edges: Edge[] } {
  // Group questions by source article
  const articleQuestions = new Map<string, Node[]>();

  // Find article-question relationships
  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (
      sourceNode?.type === "conversationNode" &&
      targetNode?.type === "questionNode"
    ) {
      if (!articleQuestions.has(sourceNode.id)) {
        articleQuestions.set(sourceNode.id, []);
      }
      articleQuestions.get(sourceNode.id)?.push(targetNode);
    }
  });

  // Position questions in a semi-circle around each article
  articleQuestions.forEach((questionNodes, articleId) => {
    const articleNode = nodes.find((n) => n.id === articleId);
    if (!articleNode) return;

    const count = questionNodes.length;
    const radius = 350; // Distance from article

    questionNodes.forEach((questionNode, index) => {
      // Position in a semi-circle (180 degrees)
      const angle = (Math.PI / (count + 1)) * (index + 1);
      const x = articleNode.position.x + radius * Math.cos(angle);
      const y = articleNode.position.y + radius * Math.sin(angle);

      questionNode.position = { x, y };
    });
  });

  return { nodes, edges };
}

/**
 * Calculate layout for a single new node and its connections to existing nodes
 * Useful for incrementally adding nodes without recalculating the entire layout
 */
export function computeLayoutForNewNode(
  existingNodes: Node[],
  existingEdges: Edge[],
  newNodeData: {
    id: string;
    type: "conversationNode" | "questionNode";
    data: any;
  },
  connections: { source: string; target: string }[]
): { nodes: Node[]; edges: Edge[] } {
  // Convert existing nodes to force nodes for simulation
  const forceNodes: ForceNode[] = existingNodes.map((node) => ({
    id: node.id,
    type: node.type as "conversationNode" | "questionNode",
    width:
      node.type === "conversationNode"
        ? NODE_DIMENSIONS.conversationNode.width
        : NODE_DIMENSIONS.questionNode.width,
    height:
      node.type === "conversationNode"
        ? NODE_DIMENSIONS.conversationNode.height
        : NODE_DIMENSIONS.questionNode.height,
    x: node.position.x,
    y: node.position.y,
    // Initially fix existing nodes to maintain their positions
    fx: node.position.x,
    fy: node.position.y,
    data: node.data,
  }));

  // Create the new node
  const newForceNode: ForceNode = {
    id: newNodeData.id,
    type: newNodeData.type,
    width:
      newNodeData.type === "conversationNode"
        ? NODE_DIMENSIONS.conversationNode.width
        : NODE_DIMENSIONS.questionNode.width,
    height:
      newNodeData.type === "conversationNode"
        ? NODE_DIMENSIONS.conversationNode.height
        : NODE_DIMENSIONS.questionNode.height,
    // Initial position - will be determined by simulation
    data: newNodeData.data,
  };

  // Add the new node
  forceNodes.push(newForceNode);

  // Convert existing edges
  const forceLinks = existingEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));

  // Add new connections
  const newForceLinks = connections.map((conn) => ({
    id: `${conn.source}-${conn.target}`,
    source: conn.source,
    target: conn.target,
  }));

  forceLinks.push(...newForceLinks);

  // Create a small simulation just for positioning the new node
  const simulation = d3
    .forceSimulation(forceNodes as any)
    .force(
      "link",
      d3
        .forceLink(forceLinks)
        .id((d: any) => d.id)
        .distance(200)
    )
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(0, 0).strength(0.05))
    .force(
      "collision",
      d3.forceCollide().radius((d: any) => {
        const dim =
          d.type === "conversationNode"
            ? NODE_DIMENSIONS.conversationNode
            : NODE_DIMENSIONS.questionNode;
        return (
          Math.sqrt(Math.pow(dim.width / 2, 2) + Math.pow(dim.height / 2, 2)) +
          30
        );
      })
    );

  // Run the simulation
  for (let i = 0; i < 100; i++) {
    simulation.tick();
  }

  // Convert back to ReactFlow format
  const nodes: Node[] = forceNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: {
      x: node.x || 0,
      y: node.y || 0,
    },
    data: node.data,
  }));

  const edges: Edge[] = forceLinks.map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
    type: "smoothstep",
  }));

  return { nodes, edges };
}

/**
 * Save node positions to the database
 * This function should be called after node positions have been updated
 * in the UI (e.g., after drag operations)
 */
export function computePositionUpdates(
  nodes: Node[]
): { id: string; type: "article" | "question"; x: number; y: number }[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type === "conversationNode" ? "article" : "question",
    x: node.position.x,
    y: node.position.y,
  }));
}

/**
 * Additional optimization for large graphs - selectively renders edges and lower-priority nodes
 * based on graph size and viewport
 */
export function optimizeGraphForPerformance(
  nodes: Node[],
  edges: Edge[],
  activeArticleId: string | null | undefined,
  viewport: { x: number; y: number; zoom: number },
  screenDimensions: { width: number; height: number }
): { nodes: Node[]; edges: Edge[] } {
  // For small graphs (under 50 nodes), no optimization needed
  if (nodes.length < 50) {
    return { nodes, edges };
  }

  // For larger graphs, optimize by:
  // 1. Always show the active node and its immediate connections
  // 2. For other nodes, use distance from active node to determine visibility
  // 3. Only show edges between visible nodes

  // Find active node
  const activeNode = activeArticleId
    ? nodes.find((node) => node.id === activeArticleId)
    : null;

  // If no active node, fall back to showing nodes near the center of the viewport
  const viewportCenter = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
  };

  // Calculate visible area in graph coordinates
  const visibleArea = {
    minX: viewportCenter.x - screenDimensions.width / viewport.zoom / 2,
    maxX: viewportCenter.x + screenDimensions.width / viewport.zoom / 2,
    minY: viewportCenter.y - screenDimensions.height / viewport.zoom / 2,
    maxY: viewportCenter.y + screenDimensions.height / viewport.zoom / 2,
  };

  // Find nodes connected to active node
  const connectedNodeIds = new Set<string>();
  if (activeNode) {
    // Add the active node itself
    connectedNodeIds.add(activeNode.id);

    // Find all edges connected to the active node
    edges.forEach((edge) => {
      if (edge.source === activeNode.id) {
        connectedNodeIds.add(edge.target);
      } else if (edge.target === activeNode.id) {
        connectedNodeIds.add(edge.source);
      }
    });
  }

  // Filter nodes to include:
  // 1. The active node and its connections
  // 2. Nodes within the visible area
  // 3. For very large graphs (100+), limit to closer nodes
  const isLargeGraph = nodes.length >= 100;
  const visibleNodes = nodes.filter((node) => {
    // Always include active node and its direct connections
    if (connectedNodeIds.has(node.id)) {
      return true;
    }

    // For nodes not connected to active node, check if within visible area
    const isVisible =
      node.position.x >= visibleArea.minX &&
      node.position.x <= visibleArea.maxX &&
      node.position.y >= visibleArea.minY &&
      node.position.y <= visibleArea.maxY;

    // For large graphs, add additional filtering
    if (isLargeGraph && isVisible) {
      // For very large graphs, only show nodes close to the center or active node
      if (activeNode) {
        const distanceToActive = Math.sqrt(
          Math.pow(node.position.x - activeNode.position.x, 2) +
            Math.pow(node.position.y - activeNode.position.y, 2)
        );
        return distanceToActive < 800; // Threshold distance
      } else {
        const distanceToCenter = Math.sqrt(
          Math.pow(node.position.x - viewportCenter.x, 2) +
            Math.pow(node.position.y - viewportCenter.y, 2)
        );
        return distanceToCenter < 800; // Threshold distance
      }
    }

    return isVisible;
  });

  // Create a Set of visible node IDs for edge filtering
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

  // Filter edges to only include those between visible nodes
  const visibleEdges = edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );

  return {
    nodes: visibleNodes,
    edges: visibleEdges,
  };
}

/**
 * Calculates approximate graph density to help optimize layout parameters
 * for different graph sizes and characteristics
 */
export function calculateGraphDensity(
  nodes: Node[],
  edges: Edge[]
): {
  density: number;
  recommendedLinkDistance: number;
  recommendedChargeStrength: number;
} {
  if (nodes.length <= 1) {
    return {
      density: 0,
      recommendedLinkDistance: 200,
      recommendedChargeStrength: -500,
    };
  }

  // Calculate the maximum possible edges for this number of nodes
  const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;

  // Calculate density as ratio of actual edges to max possible edges
  const density = edges.length / maxPossibleEdges;

  // Adjust recommended layout parameters based on density and graph size
  let recommendedLinkDistance = 200;
  let recommendedChargeStrength = -500;

  if (density > 0.3) {
    // Dense graph - increase distances to prevent crowding
    recommendedLinkDistance = 250;
    recommendedChargeStrength = -700;
  } else if (density < 0.1) {
    // Sparse graph - reduce distances for a tighter layout
    recommendedLinkDistance = 150;
    recommendedChargeStrength = -350;
  }

  // Scale based on graph size
  if (nodes.length > 100) {
    recommendedLinkDistance *= 1.5;
    recommendedChargeStrength *= 1.5;
  } else if (nodes.length < 20) {
    recommendedLinkDistance *= 0.8;
    recommendedChargeStrength *= 0.8;
  }

  return {
    density,
    recommendedLinkDistance,
    recommendedChargeStrength,
  };
}
