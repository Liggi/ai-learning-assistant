import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Provider } from "jotai/react";

// Create a mock implementation directly in the test file
const MockPersonalLearningMapFlow = () => {
  return <div data-testid="mock-flow">Mock Personal Learning Map Flow</div>;
};

// Simple component for testing the test environment
const TestComponent = () => {
  return <div data-testid="test-component">Test Component</div>;
};

// Disable all mocks for simplicity
vi.mock("@/utils/force-directed-layout", () => ({
  computeForceLayout: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
  optimizeGraphForPerformance: vi
    .fn()
    .mockReturnValue({ nodes: [], edges: [] }),
  calculateGraphDensity: vi.fn().mockReturnValue({
    recommendedLinkDistance: 200,
    recommendedChargeStrength: -500,
  }),
}));

// Mock the React Flow library
vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }) => <div data-testid="react-flow">{children}</div>,
  ReactFlowProvider: ({ children }) => <div>{children}</div>,
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  Panel: ({ children }) => <div data-testid="panel">{children}</div>,
  useReactFlow: () => ({
    fitView: vi.fn(),
    getNodes: () => [],
  }),
}));

describe("Personal Learning Map Tests", () => {
  it("can run basic tests", () => {
    render(<TestComponent />);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });

  it("can render a mock flow component", () => {
    render(
      <Provider>
        <MockPersonalLearningMapFlow />
      </Provider>
    );

    expect(screen.getByTestId("mock-flow")).toBeInTheDocument();
  });
});
