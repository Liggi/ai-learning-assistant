import { describe, it, expect } from "vitest";
import {
  optimizeGraphForPerformance,
  calculateGraphDensity,
} from "@/utils/force-directed-layout";

describe("Graph Performance Optimizations", () => {
  // Test for graph optimization function
  it("should not optimize small graphs (under 50 nodes)", () => {
    // Setup test data - small graph
    const nodes = Array.from({ length: 30 }, (_, i) => ({
      id: `node-${i}`,
      type: i % 2 === 0 ? "conversationNode" : "questionNode",
      position: { x: i * 100, y: i * 50 },
      data: { id: `node-${i}` },
    }));

    const edges = Array.from({ length: 20 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${i + 1}`,
      type: "smoothstep",
    }));

    const viewport = { x: 0, y: 0, zoom: 1 };
    const screenDimensions = { width: 1000, height: 800 };

    // Call the optimization function
    const result = optimizeGraphForPerformance(
      nodes,
      edges,
      "node-5", // active node
      viewport,
      screenDimensions
    );

    // For small graphs, it should return the original graph
    expect(result.nodes.length).toBe(nodes.length);
    expect(result.edges.length).toBe(edges.length);
  });

  it("should optimize large graphs (over 50 nodes)", () => {
    // Setup test data - large graph
    const nodes = Array.from({ length: 80 }, (_, i) => ({
      id: `node-${i}`,
      type: i % 2 === 0 ? "conversationNode" : "questionNode",
      position: { x: i * 100, y: i * 50 },
      data: { id: `node-${i}` },
    }));

    const edges = Array.from({ length: 70 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i}`,
      target: `node-${i + 1}`,
      type: "smoothstep",
    }));

    // Simulate a small viewport that can only see a portion of the graph
    const viewport = { x: 0, y: 0, zoom: 1 };
    const screenDimensions = { width: 1000, height: 800 };

    // Call the optimization function
    const result = optimizeGraphForPerformance(
      nodes,
      edges,
      "node-5", // active node
      viewport,
      screenDimensions
    );

    // For large graphs, it should return a subset of nodes and edges
    expect(result.nodes.length).toBeLessThan(nodes.length);
    expect(result.edges.length).toBeLessThan(edges.length);

    // The active node should always be included
    expect(result.nodes.some((node) => node.id === "node-5")).toBe(true);

    // Connections to the active node should be included
    expect(
      result.edges.some(
        (edge) => edge.source === "node-5" || edge.target === "node-5"
      )
    ).toBe(true);
  });

  // Test for graph density calculation
  it("should calculate correct graph density and recommended layout parameters", () => {
    // Sparse graph
    const sparseNodes = Array.from({ length: 20 }, (_, i) => ({
      id: `node-${i}`,
      position: { x: 0, y: 0 },
      data: {},
    }));

    const sparseEdges = Array.from({ length: 10 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-0`,
      target: `node-${i + 1}`,
    }));

    const sparseResult = calculateGraphDensity(sparseNodes, sparseEdges);

    // Check density calculation (10 edges out of 190 possible for 20 nodes)
    expect(sparseResult.density).toBeLessThan(0.1);

    // Denser graph
    const denseNodes = Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      position: { x: 0, y: 0 },
      data: {},
    }));

    const denseEdges = Array.from({ length: 20 }, (_, i) => ({
      id: `edge-${i % 10}`,
      source: `node-${i % 5}`,
      target: `node-${(i % 5) + 5}`,
    }));

    const denseResult = calculateGraphDensity(denseNodes, denseEdges);

    // For denser graphs we expect different layout parameters
    expect(denseResult.recommendedLinkDistance).not.toBe(
      sparseResult.recommendedLinkDistance
    );
    expect(denseResult.recommendedChargeStrength).not.toBe(
      sparseResult.recommendedChargeStrength
    );
  });
});
