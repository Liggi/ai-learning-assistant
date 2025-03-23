import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "jotai/react";
import { useAtom } from "jotai";
import {
  activeArticleIdAtom,
  selectNodeAtom,
  flowNodesAtom,
  articlesAtom,
  questionsAtom,
} from "@/state/learning-map-state";
import { mockArticles, mockQuestions } from "@/test/mock-data";

// Mock ReactFlow as it's difficult to test in a unit test environment
vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ onNodeClick, nodes }) => (
    <div data-testid="react-flow">
      {nodes.map((node) => (
        <div
          key={node.id}
          data-testid={`node-${node.id}`}
          onClick={(e) => onNodeClick(e, node)}
        >
          {node.id}
        </div>
      ))}
    </div>
  ),
  ReactFlowProvider: ({ children }) => <div>{children}</div>,
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  useReactFlow: () => ({
    fitView: vi.fn(),
    getNodes: () => [],
  }),
}));

// Create a test component that uses the navigation atoms
const NavigationTestComponent = () => {
  const [activeArticleId] = useAtom(activeArticleIdAtom);
  const [, selectNode] = useAtom(selectNodeAtom);
  const [nodes] = useAtom(flowNodesAtom);

  return (
    <div>
      <div data-testid="active-article-id">{activeArticleId || "none"}</div>
      <div data-testid="node-count">{nodes.length}</div>
      <button
        data-testid="select-article"
        onClick={() => selectNode("article1")}
      >
        Select Article 1
      </button>
      <button
        data-testid="select-question"
        onClick={() => selectNode("question1")}
      >
        Select Question 1
      </button>
    </div>
  );
};

describe("Navigation Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should navigate to articles when clicking on article nodes", async () => {
    // Setup the test component with the mocked state
    const TestWithState = () => {
      const [, setArticles] = useAtom(articlesAtom);

      // Initialize the state with mock articles
      useEffect(() => {
        setArticles(mockArticles);
      }, [setArticles]);

      return <NavigationTestComponent />;
    };

    const { getByTestId } = render(
      <Provider>
        <TestWithState />
      </Provider>
    );

    // Initial state should be no active article
    expect(getByTestId("active-article-id").textContent).toBe("none");

    // Select an article
    await act(async () => {
      fireEvent.click(getByTestId("select-article"));
    });

    // Active article should be updated
    expect(getByTestId("active-article-id").textContent).toBe("article1");
  });

  it("should navigate to destination articles when clicking on question nodes with destinations", async () => {
    // Setup the test component with the mocked state
    const TestWithState = () => {
      const [, setArticles] = useAtom(articlesAtom);
      const [, setQuestions] = useAtom(questionsAtom);
      const [, setActiveArticleId] = useAtom(activeArticleIdAtom);

      // Initialize the state
      useEffect(() => {
        setArticles(mockArticles);
        setQuestions([
          {
            ...mockQuestions[0],
            id: "question1",
            destinationArticleId: "article2",
          },
        ]);
        setActiveArticleId(null);
      }, [setArticles, setQuestions, setActiveArticleId]);

      return <NavigationTestComponent />;
    };

    // Render with the mocked state
    const { getByTestId } = render(
      <Provider>
        <TestWithState />
      </Provider>
    );

    // Select a question with a destination
    await act(async () => {
      fireEvent.click(getByTestId("select-question"));
    });

    // Should navigate to the destination article
    expect(getByTestId("active-article-id").textContent).toBe("article2");
  });
});
