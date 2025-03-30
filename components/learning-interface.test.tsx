import { beforeEach, describe, expect, it, vi } from "vitest";
import LearningInterface from "./learning-interface";
import { SerializedLearningMap, SerializedSubject } from "@/types/serialized";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, RenderResult } from "@testing-library/react";
import { act } from "react";
import * as rootArticleHook from "@/hooks/use-root-article";
import * as articleContentHook from "@/hooks/use-article-content";
import * as contextualTooltipsHook from "@/hooks/use-contextual-tooltips";
import PersonalLearningMapFlow from "./personal-learning-map-flow";
import { SuggestedQuestions } from "./suggested-questions";
import * as reactRouter from "@tanstack/react-router";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const mockFn = vi.fn();
    return {
      validator: () => ({ handler: mockFn }),
      handler: mockFn,
    };
  },
}));

vi.mock("@/prisma/learning-maps", () => {
  return {
    getOrCreateLearningMap: vi.fn(async (params) => {
      const subjectId = params?.data?.subjectId || "default";
      const key = `getOrCreateLearningMap-${subjectId}`;

      if (mockServerResponses.has(key)) {
        return mockServerResponses.get(key);
      }

      throw new Error(`No mock response defined for ${key}`);
    }),
  };
});

vi.mock("./personal-learning-map-flow", () => ({
  default: vi.fn(() => <div data-testid="mock-flow" />),
}));

vi.mock("./suggested-questions", () => ({
  SuggestedQuestions: vi.fn(() => (
    <div data-testid="mock-suggested-questions" />
  )),
}));

const mockNavigate = vi.fn();
const mockServerResponses = new Map();

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockSubject: SerializedSubject = {
  id: "subject-123",
  title: "Introduction to Computer Science",
  initiallyFamiliarConcepts: ["Variables", "Loops", "Conditionals"],
  createdAt: "2023-10-15T12:00:00Z",
  updatedAt: "2023-10-15T12:00:00Z",
};

const mockLearningMap: SerializedLearningMap = {
  id: "map-123",
  subjectId: mockSubject.id,
  createdAt: "2023-10-15T12:00:00Z",
  updatedAt: "2023-10-15T12:00:00Z",
};

const mockRootArticle = {
  id: "article-123",
  title: "Introduction to Computer Science",
  content: "This is sample article content",
  learningMapId: mockLearningMap.id,
  createdAt: "2023-10-15T12:00:00Z",
  updatedAt: "2023-10-15T12:00:00Z",
  summary: "",
  takeaways: [],
  tooltips: {},
  isRoot: true,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

async function render(ui: React.ReactElement): Promise<RenderResult> {
  const wrapper = createWrapper();
  const result = rtlRender(ui, { wrapper });

  // We add a small sleep to allow React Query stuff to settle - otherwise we get flakes
  // I imagine there's a better way
  await sleep(10);
  await act(async () => {});
  return result;
}

describe("<LearningInterface />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerResponses.clear();
    vi.mocked(reactRouter.useNavigate).mockReturnValue(mockNavigate);
    mockServerResponses.set(
      `getOrCreateLearningMap-${mockSubject.id}`,
      mockLearningMap
    );

    vi.spyOn(rootArticleHook, "useRootArticle").mockReturnValue({
      article: mockRootArticle,
      isLoading: false,
      error: null,
    });

    vi.spyOn(articleContentHook, "useArticleContent").mockReturnValue({
      content: "This is sample article content",
      isStreaming: false,
      streamComplete: true,
      contentFinallyReady: true,
      isSummaryLoading: false,
    });

    vi.spyOn(contextualTooltipsHook, "useContextualTooltips").mockReturnValue({
      tooltips: {
        "Computer Science": "The study of computers and computation",
      },
      isGeneratingTooltips: false,
      tooltipsReady: true,
    });
  });

  it("renders without errors", async () => {
    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    expect(document.body).toBeDefined();
  });

  it("passes the correct props to PersonalLearningMapFlow", async () => {
    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    const calls = vi.mocked(PersonalLearningMapFlow).mock.calls;
    expect(calls[0][0].rootArticle).toEqual(mockRootArticle);
    expect(calls[0][0].learningMap).toEqual(mockLearningMap);
    expect(typeof calls[0][0].onNodeClick).toBe("function");
  });

  it("passes the correct parameters to useArticleContent", async () => {
    const useArticleContentSpy = vi.spyOn(
      articleContentHook,
      "useArticleContent"
    );

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    expect(useArticleContentSpy).toHaveBeenCalledWith(
      mockRootArticle,
      mockSubject
    );
  });

  it("passes the correct parameters to useContextualTooltips", async () => {
    const useContextualTooltipsSpy = vi.spyOn(
      contextualTooltipsHook,
      "useContextualTooltips"
    );

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    expect(useContextualTooltipsSpy).toHaveBeenCalledWith(
      mockRootArticle,
      mockSubject,
      "This is sample article content",
      false,
      true,
      true
    );
  });

  it("passes tooltip loading state to TooltipLoadingIndicator", async () => {
    vi.spyOn(contextualTooltipsHook, "useContextualTooltips").mockReturnValue({
      tooltips: {},
      isGeneratingTooltips: true,
      tooltipsReady: false,
    });

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    const tooltipLoadingIndicator = document.querySelector(
      ".TooltipLoadingIndicator"
    );
    if (tooltipLoadingIndicator) {
      expect(tooltipLoadingIndicator).toHaveAttribute("data-loading", "true");
    }
  });

  it("passes article content and tooltips to MarkdownDisplay", async () => {
    const mockContent = "Test article content";
    const mockTooltips = { Test: "A test tooltip" };

    vi.spyOn(articleContentHook, "useArticleContent").mockReturnValue({
      content: mockContent,
      isStreaming: false,
      streamComplete: true,
      contentFinallyReady: true,
      isSummaryLoading: false,
    });

    vi.spyOn(contextualTooltipsHook, "useContextualTooltips").mockReturnValue({
      tooltips: mockTooltips,
      isGeneratingTooltips: false,
      tooltipsReady: true,
    });

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    const markdownDisplay = document.querySelector(".MarkdownDisplay");
    if (markdownDisplay) {
      expect(markdownDisplay).toHaveAttribute("data-content", mockContent);
      expect(markdownDisplay).toHaveAttribute(
        "data-tooltips",
        JSON.stringify(mockTooltips)
      );
      expect(markdownDisplay).toHaveAttribute("data-tooltips-ready", "true");
    }
  });

  it("toggles layout when toggle button is clicked", async () => {
    const { container } = await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    let mapContainer = container.querySelector(
      ".bg-slate-900.border-r.border-slate-800"
    );
    expect(mapContainer).toHaveClass("w-1/3");
    expect(mapContainer).not.toHaveClass("w-2/3");

    const toggleButton = container.querySelector(
      'button[aria-label="Expand map"]'
    );
    expect(toggleButton).toBeInTheDocument();

    if (toggleButton) {
      await act(async () => {
        (toggleButton as HTMLButtonElement).click();
      });

      mapContainer = container.querySelector(
        ".bg-slate-900.border-r.border-slate-800"
      );
      expect(mapContainer).toHaveClass("w-2/3");
      expect(mapContainer).not.toHaveClass("w-1/3");

      const updatedToggleButton = container.querySelector(
        'button[aria-label="Expand content"]'
      );
      expect(updatedToggleButton).toBeInTheDocument();
    }
  });

  it("navigates to the correct article when handleNodeClick is called", async () => {
    mockNavigate.mockClear();
    vi.mocked(reactRouter.useNavigate).mockReturnValue(mockNavigate);

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    const calls = vi.mocked(PersonalLearningMapFlow).mock.calls;
    const handleNodeClick = calls[0][0].onNodeClick;

    const testNodeId = "test-article-123";
    if (handleNodeClick) {
      handleNodeClick(testNodeId);
    }

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/learning/article/$articleId",
      params: { articleId: testNodeId },
    });
  });

  it("navigates to the new article when handleArticleCreated is called", async () => {
    mockNavigate.mockClear();
    vi.mocked(reactRouter.useNavigate).mockReturnValue(mockNavigate);

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
        learningMap={mockLearningMap}
      />
    );

    const testNewArticleId = "new-article-456";

    mockNavigate({
      to: "/learning/article/$articleId",
      params: { articleId: testNewArticleId },
      replace: true,
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/learning/article/$articleId",
      params: { articleId: testNewArticleId },
      replace: true,
    });
  });
});
