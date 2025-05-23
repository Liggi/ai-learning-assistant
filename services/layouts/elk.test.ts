import { describe, it, expect } from "vitest";
import { calculateElkLayout } from "./elk";
import type { Edge } from "@xyflow/react";
import type { MeasuredNode } from "./elk";

describe("calculateElkLayout", () => {
  it("layouts a minimal graph and returns positions", async () => {
    const nodes: MeasuredNode<any>[] = [
      {
        id: "n1",
        type: "conversationNode",
        position: { x: 0, y: 0 },
        data: {},
        measured: { width: 350, height: 350 },
      },
      {
        id: "n2",
        type: "questionNode",
        position: { x: 0, y: 0 },
        data: {},
        measured: { width: 200, height: 100 },
      },
    ];
    const edges: Edge<any>[] = [
      { id: "e1", source: "n1", target: "n2", animated: true },
    ];

    const result = await calculateElkLayout(nodes, edges, {
      direction: "DOWN",
    });
    expect(result).not.toBeNull();
    if (!result) throw new Error("Expected layout result, got null");
    const { nodes: layoutedNodes, edges: layoutedEdges } = result;

    // Should preserve count
    expect(layoutedNodes).toHaveLength(2);
    expect(layoutedEdges).toHaveLength(1);

    // Positions should be numbers
    layoutedNodes.forEach((n) => {
      expect(typeof n.position.x).toBe("number");
      expect(typeof n.position.y).toBe("number");
    });

    // Edge styling
    expect(layoutedEdges[0].type).toBe("smoothstep");
    expect(layoutedEdges[0].animated).toBe(true);
  });
});
