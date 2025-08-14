import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { act, type JSX } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateSummary } from "@/features/generators/article-summary";
import type { SerializedArticle } from "@/types/serialized";
import { useArticleSummary } from "./use-article-summary";

vi.mock("@/features/generators/article-summary");
vi.mock("@/lib/logger");

const mockGenerateSummary = vi.mocked(generateSummary);

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createWrapper = (client: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe("useArticleSummary", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = createWrapper(queryClient);
    vi.clearAllMocks(); // Clear mocks between tests
  });

  afterEach(() => {
    queryClient.clear(); // Clear query cache
  });

  // --- Test Cases ---

  it("should return initial state with null data, not loading, no error when no article is provided", () => {
    const { result } = renderHook(() => useArticleSummary(null), { wrapper });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("should return initial state when article is undefined", () => {
    const { result } = renderHook(() => useArticleSummary(undefined), {
      wrapper,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("should return initial state and not trigger generation for invalid article (missing id)", () => {
    const invalidArticle = {
      content: "Some content",
      summary: null,
    } as unknown as SerializedArticle;
    const { result } = renderHook(() => useArticleSummary(invalidArticle), {
      wrapper,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("should return initial state and not trigger generation for invalid article (missing content)", () => {
    const invalidArticle = {
      id: "1",
      summary: null,
    } as unknown as SerializedArticle;
    const { result } = renderHook(() => useArticleSummary(invalidArticle), {
      wrapper,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("should return existing summary and not trigger generation if article already has one", () => {
    const articleWithSummary: SerializedArticle = {
      id: "1",
      content: "Article content",
      summary: "Existing summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { result } = renderHook(() => useArticleSummary(articleWithSummary), {
      wrapper,
    });
    expect(result.current.data).toBe("Existing summary");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("should trigger generation, update loading state, call invalidateQueries on success, and update data after rerender", async () => {
    const articleNeedingSummary: SerializedArticle = {
      id: "2",
      content: "Needs summary content",
      summary: "",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const generatedSummary = "This is the generated summary.";
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockGenerateSummary.mockResolvedValueOnce({
      id: "2",
      content: "Needs summary content",
      summary: generatedSummary,
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { result, rerender } = renderHook(({ article }) => useArticleSummary(article), {
      initialProps: { article: articleNeedingSummary },
      wrapper,
    });

    // Initially, no summary, and loading
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Check generation function was called
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
    expect(mockGenerateSummary).toHaveBeenCalledWith({
      data: { articleId: "2" },
    });

    // Wait for generation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check state after successful generation
    expect(result.current.error).toBeNull();
    expect(invalidateSpy).toHaveBeenCalled();

    // Simulate parent component refetching and passing updated article
    const updatedArticle: SerializedArticle = {
      ...articleNeedingSummary,
      summary: generatedSummary,
    };
    rerender({ article: updatedArticle });

    // Verify data now reflects the summary from the updated prop
    expect(result.current.data).toBe(generatedSummary);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    invalidateSpy.mockRestore();
  });

  it("should handle generation failure, update error state, and not call invalidateQueries", async () => {
    const articleNeedingSummary: SerializedArticle = {
      id: "3",
      content: "Content that fails",
      summary: "",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const generationError = new Error("AI generation failed");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockGenerateSummary.mockRejectedValueOnce(generationError); // Mock failed generation

    const { result } = renderHook(() => useArticleSummary(articleNeedingSummary), {
      wrapper,
    });

    // Wait for generation attempt and loading state
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
    expect(mockGenerateSummary).toHaveBeenCalledWith({
      data: { articleId: "3" },
    });

    // Wait for failure handling
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check state after failure
    expect(result.current.data).toBeNull(); // No summary generated
    expect(result.current.error).toBe(generationError); // Error state set
    expect(invalidateSpy).not.toHaveBeenCalled(); // Invalidate should not be called on error

    invalidateSpy.mockRestore();
  });

  it("should not trigger generation again if already loading", async () => {
    const article: SerializedArticle = {
      id: "4",
      content: "Content",
      summary: "",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Allow us to control the timing of the generation
    let resolveGeneration: (value: { summary: string } | PromiseLike<{ summary: string }>) => void;
    mockGenerateSummary.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ currentArticle }) => useArticleSummary(currentArticle),
      {
        initialProps: { currentArticle: article },
        wrapper,
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);

    // Rerender with the *same* article while still loading
    rerender({ currentArticle: article });

    // Should still be loading, but generateSummary shouldn't be called again
    expect(result.current.loading).toBe(true);
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);

    // Now resolve the generation
    await act(async () => {
      resolveGeneration({ summary: "Finally done" });
      await Promise.resolve();
    });

    rerender({ currentArticle: { ...article, summary: "Finally done" } });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.data).toBe("Finally done"));
  });

  it("should clear error state when a new article with an existing summary is provided", async () => {
    const articleWithError: SerializedArticle = {
      id: "5",
      content: "Error content",
      summary: "",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const generationError = new Error("Initial fail");
    mockGenerateSummary.mockRejectedValueOnce(generationError);

    const { result, rerender } = renderHook(
      ({ currentArticle }) => useArticleSummary(currentArticle),
      {
        initialProps: { currentArticle: articleWithError },
        wrapper,
      }
    );

    // Wait for the error state
    await waitFor(() => expect(result.current.error).toBe(generationError));
    expect(result.current.loading).toBe(false);

    // Now provide an article that already has a summary
    const articleWithSummary: SerializedArticle = {
      id: "6",
      content: "Good content",
      summary: "Already summarized",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rerender({ currentArticle: articleWithSummary });

    // Error should be cleared immediately, no loading triggered
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe("Already summarized");
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1); // Only called for the first article
  });

  it("should clear error state before starting a new generation attempt", async () => {
    const articleWithError: SerializedArticle = {
      id: "7",
      content: "Error content 2",
      summary: "",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const generationError = new Error("Fail first");
    mockGenerateSummary.mockRejectedValueOnce(generationError);

    const { result, rerender } = renderHook(
      ({ currentArticle }) => useArticleSummary(currentArticle),
      {
        initialProps: { currentArticle: articleWithError },
        wrapper,
      }
    );

    // Wait for the error state
    await waitFor(() => expect(result.current.error).toBe(generationError));
    expect(result.current.loading).toBe(false);
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);

    // Now provide a new article that needs generation
    const articleNeedsGenerating: SerializedArticle = {
      id: "8",
      content: "New content",
      summary: "",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockGenerateSummary.mockResolvedValueOnce({
      id: "8",
      content: "New content",
      summary: "Successful generation",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    rerender({ currentArticle: articleNeedsGenerating });

    // Expect error to clear and loading to start for the new generation
    await waitFor(() => {
      expect(result.current.error).toBeNull(); // Error cleared
      expect(result.current.loading).toBe(true); // New generation started
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(2); // Called again for article 8
    expect(mockGenerateSummary).toHaveBeenCalledWith({
      data: { articleId: "8" },
    });

    // Wait for the second generation to finish
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    invalidateSpy.mockRestore();
  });
});
