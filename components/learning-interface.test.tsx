import { beforeEach, describe, expect, it, vi } from "vitest";
import LearningInterface from "./learning-interface";
import { SerializedLearningMap, SerializedSubject } from "@/types/serialized";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render as rtlRender,
  RenderResult,
  screen,
} from "@testing-library/react";
import { act } from "react";
import * as rootArticleHook from "@/hooks/use-root-article";
import * as articleContentHook from "@/hooks/use-article-content";
import * as contextualTooltipsHook from "@/hooks/use-contextual-tooltips";
import * as suggestedQuestionsHook from "@/hooks/use-suggested-questions";
import PersonalLearningMapFlow from "./personal-learning-map-flow";

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const mockFn = vi.fn();
    return {
      validator: () => ({ handler: mockFn }),
      handler: mockFn,
    };
  },
}));

const mockServerResponses = new Map();

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

vi.mock("./personal-learning-map-flow", () => ({
  default: vi.fn(() => <div data-testid="mock-flow" />),
}));

describe("<LearningInterface />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerResponses.clear();

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
      hasExistingContent: true,
      isSummaryLoading: false,
    });

    vi.spyOn(contextualTooltipsHook, "useContextualTooltips").mockReturnValue({
      tooltips: {
        "Computer Science": "The study of computers and computation",
      },
      isGeneratingTooltips: false,
      tooltipsReady: true,
    });

    vi.spyOn(suggestedQuestionsHook, "useSuggestedQuestions").mockReturnValue({
      questions: ["What is computer science?", "How does a CPU work?"],
      isGeneratingQuestions: false,
      questionsReady: true,
    });
  });

  it("renders without errors", async () => {
    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    expect(document.body).toBeDefined();
  });

  it("passes the correct learning map to useRootArticle", async () => {
    const useRootArticleSpy = vi.spyOn(rootArticleHook, "useRootArticle");

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    expect(useRootArticleSpy).toHaveBeenCalledWith(mockLearningMap);
  });

  it("renders loading state when loading the learning map", async () => {
    // Set up in a loading state
    vi.spyOn(rootArticleHook, "useRootArticle").mockReturnValue({
      article: null,
      isLoading: true,
      error: null,
    });

    await render(
      <LearningInterface subject={mockSubject} activeArticle={null} />
    );

    expect(
      screen.getByText("Initializing Root Article...")
    ).toBeInTheDocument();
  });

  it("renders error state when there is an error", async () => {
    const errorMessage = "Failed to load data";
    vi.spyOn(rootArticleHook, "useRootArticle").mockReturnValue({
      article: null,
      isLoading: false,
      error: new Error(errorMessage),
    });

    await render(
      <LearningInterface subject={mockSubject} activeArticle={null} />
    );

    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
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
      />
    );

    expect(useContextualTooltipsSpy).toHaveBeenCalledWith(
      mockRootArticle,
      mockSubject,
      "This is sample article content",
      false,
      true
    );
  });

  it("passes the correct parameters to useSuggestedQuestions", async () => {
    const useSuggestedQuestionsSpy = vi.spyOn(
      suggestedQuestionsHook,
      "useSuggestedQuestions"
    );

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    expect(useSuggestedQuestionsSpy).toHaveBeenCalledWith(
      mockRootArticle,
      mockSubject,
      false,
      true
    );
  });

  it("shows streaming indicator when content is streaming", async () => {
    vi.spyOn(articleContentHook, "useArticleContent").mockReturnValue({
      content: "This is streaming content",
      isStreaming: true,
      streamComplete: false,
      hasExistingContent: false,
      isSummaryLoading: false,
    });

    const { container } = await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    // @TODO: There's probably a better way check this
    const dotsContainer = container.querySelector(
      ".flex.items-center.space-x-1"
    );
    expect(dotsContainer).toBeInTheDocument();
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
      />
    );

    // @TODO: Mocked for now
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
      hasExistingContent: true,
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
      />
    );

    // @TODO: Mocked for now
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

  it("passes questions, loading state, and ready state to SuggestedQuestions", async () => {
    const mockQuestions = ["Question 1", "Question 2"];

    vi.spyOn(suggestedQuestionsHook, "useSuggestedQuestions").mockReturnValue({
      questions: mockQuestions,
      isGeneratingQuestions: false,
      questionsReady: true,
    });

    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    // @TODO: Mocked for now
    const suggestedQuestions = document.querySelector(".SuggestedQuestions");
    if (suggestedQuestions) {
      expect(suggestedQuestions).toHaveAttribute(
        "data-questions",
        JSON.stringify(mockQuestions)
      );
      expect(suggestedQuestions).toHaveAttribute("data-loading", "false");
      expect(suggestedQuestions).toHaveAttribute("data-ready", "true");
    }
  });

  it("passes the root article to PersonalLearningMapFlow", async () => {
    await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    // @TODO: Mocked for now
    expect(PersonalLearningMapFlow).toHaveBeenCalled();
    const calls = vi.mocked(PersonalLearningMapFlow).mock.calls;
    expect(calls[0][0].rootArticle).toEqual(mockRootArticle);
    expect(typeof calls[0][0].onNodeClick).toBe("function");
  });

  it("toggles layout when toggle button is clicked", async () => {
    const { container } = await render(
      <LearningInterface
        subject={mockSubject}
        activeArticle={mockRootArticle}
      />
    );

    // Initially the map should have w-1/3 class
    let mapContainer = container.querySelector(
      ".bg-slate-900.border-r.border-slate-800"
    );
    expect(mapContainer).toHaveClass("w-1/3");
    expect(mapContainer).not.toHaveClass("w-2/3");

    // Find and click the toggle button
    const toggleButton = container.querySelector(
      'button[aria-label="Expand map"]'
    );
    expect(toggleButton).toBeInTheDocument();

    if (toggleButton) {
      await act(async () => {
        (toggleButton as HTMLButtonElement).click();
      });

      // After clicking, the map should have w-2/3 class
      mapContainer = container.querySelector(
        ".bg-slate-900.border-r.border-slate-800"
      );
      expect(mapContainer).toHaveClass("w-2/3");
      expect(mapContainer).not.toHaveClass("w-1/3");

      // The toggle button should have changed its aria-label
      const updatedToggleButton = container.querySelector(
        'button[aria-label="Expand content"]'
      );
      expect(updatedToggleButton).toBeInTheDocument();
    }
  });

  it("renders placeholder message when no article is selected", async () => {
    await render(
      <LearningInterface subject={mockSubject} activeArticle={null} />
    );

    expect(
      screen.getByText("Select an article or topic on the map to learn more.")
    ).toBeInTheDocument();
  });

  it("renders placeholder for questions when no article is selected", async () => {
    await render(
      <LearningInterface subject={mockSubject} activeArticle={null} />
    );

    expect(
      screen.getByText("Select an article to see suggested questions.")
    ).toBeInTheDocument();
  });

  it("displays initialization message when root article is being loaded", async () => {
    vi.spyOn(rootArticleHook, "useRootArticle").mockReturnValue({
      article: null,
      isLoading: true,
      error: null,
    });

    await render(
      <LearningInterface subject={mockSubject} activeArticle={null} />
    );

    expect(
      screen.getByText("Initializing Root Article...")
    ).toBeInTheDocument();
  });
});
