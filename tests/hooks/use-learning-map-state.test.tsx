import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLearningMapState } from "../../hooks/use-learning-map-state";
import { Provider } from "jotai/react";

// Mock the logger to prevent console output during tests
vi.mock("@/lib/logger", () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("useLearningMapState", () => {
  // Helper function to render the hook within a Jotai Provider
  const renderHookWithProvider = () => {
    return renderHook(() => useLearningMapState(), {
      wrapper: ({ children }) => <Provider>{children}</Provider>,
    });
  };

  it("should initialize with default values", () => {
    const { result } = renderHookWithProvider();

    expect(result.current.learningMapId).toBeNull();
    expect(result.current.activeArticleId).toBeNull();
    expect(result.current.activeArticle).toBeNull();
    expect(result.current.rootArticle).toBeNull();
    expect(result.current.questionContext).toBeNull();
    expect(result.current.articles).toEqual([]);
    expect(result.current.questions).toEqual([]);
    expect(result.current.hasArticles).toBe(false);
    expect(result.current.flowNodes).toEqual([]);
    expect(result.current.flowEdges).toEqual([]);
    expect(result.current.flowNeedsUpdate).toBe(true);
  });

  it("should update learningMapId", () => {
    const { result } = renderHookWithProvider();

    act(() => {
      result.current.setLearningMapId("map1");
    });

    expect(result.current.learningMapId).toBe("map1");
  });

  it("should update activeArticleId", () => {
    const { result } = renderHookWithProvider();

    act(() => {
      result.current.setActiveArticleId("article1");
    });

    expect(result.current.activeArticleId).toBe("article1");
  });

  it("should handle node click", () => {
    const { result } = renderHookWithProvider();

    // First add an article to ensure the node can be found
    act(() => {
      result.current.addArticle({
        id: "article1",
        isRoot: true,
        content: "",
        summary: "",
        takeaways: [],
        learningMapId: "map1",
        tooltips: {},
        questions: [],
        answerToQuestions: [],
        createdAt: "",
        updatedAt: "",
        positionX: null,
        positionY: null,
      });
    });

    // Then simulate a node click
    act(() => {
      result.current.handleNodeClick("article1");
    });

    // The active article should be set
    expect(result.current.activeArticleId).toBe("article1");
  });

  it("should initialize learning map", () => {
    const { result } = renderHookWithProvider();

    const mockLearningMap = {
      id: "map1",
      subjectId: "subject1",
      createdAt: "",
      updatedAt: "",
      articles: [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [
            {
              id: "question1",
              text: "Test question",
              articleId: "article1",
              destinationArticleId: null,
              createdAt: "",
              updatedAt: "",
              positionX: null,
              positionY: null,
            },
          ],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ],
    };

    act(() => {
      result.current.initializeLearningMap(mockLearningMap);
    });

    // Check that the learning map is correctly initialized
    expect(result.current.learningMapId).toBe("map1");
    expect(result.current.articles).toHaveLength(1);
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.rootArticle?.id).toBe("article1");
    expect(result.current.activeArticleId).toBe("article1");
    expect(result.current.hasArticles).toBe(true);
  });

  it("should update flow visualization", () => {
    const { result } = renderHookWithProvider();

    const mockNodes = [{ id: "node1", position: { x: 0, y: 0 }, data: {} }];
    const mockEdges = [{ id: "edge1", source: "node1", target: "node2" }];

    act(() => {
      result.current.updateFlowVisualization(mockNodes, mockEdges);
    });

    expect(result.current.flowNodes).toEqual(mockNodes);
    expect(result.current.flowEdges).toEqual(mockEdges);
    expect(result.current.flowNeedsUpdate).toBe(false);
  });

  it("should handle viewport changes", () => {
    const { result } = renderHookWithProvider();

    const newViewport = { x: 100, y: 200, zoom: 1.5 };

    act(() => {
      result.current.handleViewportChange(newViewport);
    });

    expect(result.current.viewport).toEqual(newViewport);
  });
});
