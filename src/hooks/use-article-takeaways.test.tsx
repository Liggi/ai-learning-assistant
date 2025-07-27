import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, JSX } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

import { useArticleTakeaways } from "./use-article-takeaways";
import { extractTakeaways } from "@/lib/article-takeaway-parser";
import { useUpdateArticle } from "@/hooks/api/articles";
import { SerializedArticle } from "@/types/serialized";

vi.mock("@/lib/article-takeaway-parser");
vi.mock("@/hooks/api/articles");
vi.mock("@/lib/logger");

const mockExtractTakeaways = vi.mocked(extractTakeaways);
const mockUseUpdateArticle = vi.mocked(useUpdateArticle);

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

describe("useArticleTakeaways", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = createWrapper(queryClient);
    mockMutateAsync = vi.fn();
    mockUseUpdateArticle.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("should return initial state with null data, not loading, no error when no article is provided", () => {
    const { result } = renderHook(() => useArticleTakeaways(null), { wrapper });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockExtractTakeaways).not.toHaveBeenCalled();
  });

  it("should return initial state when article is undefined", () => {
    const { result } = renderHook(() => useArticleTakeaways(undefined), {
      wrapper,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockExtractTakeaways).not.toHaveBeenCalled();
  });

  it("should return initial state and not trigger extraction for invalid article (missing id)", () => {
    const invalidArticle = {
      content: "Some content",
      takeaways: null,
    } as unknown as SerializedArticle;
    const { result } = renderHook(() => useArticleTakeaways(invalidArticle), {
      wrapper,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockExtractTakeaways).not.toHaveBeenCalled();
  });

  it("should return initial state and not trigger extraction for invalid article (missing content)", () => {
    const invalidArticle = {
      id: "1",
      takeaways: null,
    } as unknown as SerializedArticle;
    const { result } = renderHook(() => useArticleTakeaways(invalidArticle), {
      wrapper,
    });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockExtractTakeaways).not.toHaveBeenCalled();
  });

  it("should return existing takeaways and not trigger extraction if article already has them", () => {
    const articleWithTakeaways: SerializedArticle = {
      id: "1",
      content: "Article content",
      summary: "Summary",
      takeaways: ["First takeaway", "Second takeaway"],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { result } = renderHook(
      () => useArticleTakeaways(articleWithTakeaways),
      {
        wrapper,
      }
    );
    expect(result.current.data).toEqual(["First takeaway", "Second takeaway"]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockExtractTakeaways).not.toHaveBeenCalled();
  });

  it("should trigger extraction, update loading state, call invalidateQueries on success, and update data after rerender", async () => {
    const articleNeedingTakeaways: SerializedArticle = {
      id: "2",
      content: "Needs takeaways content",
      summary: "Summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const extractedTakeaways = ["First takeaway", "Second takeaway"];
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockExtractTakeaways.mockReturnValueOnce(extractedTakeaways);
    mockMutateAsync.mockImplementationOnce((_, options) => {
      if (options?.onSuccess) {
        options.onSuccess({
          ...articleNeedingTakeaways,
          takeaways: extractedTakeaways,
        });
      }
      return Promise.resolve({
        ...articleNeedingTakeaways,
        takeaways: extractedTakeaways,
      });
    });

    const { result, rerender } = renderHook(
      ({ article }) => useArticleTakeaways(article),
      {
        initialProps: { article: articleNeedingTakeaways },
        wrapper,
      }
    );

    // Initially, no takeaways, and loading
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Check extraction function was called
    expect(mockExtractTakeaways).toHaveBeenCalledTimes(1);
    expect(mockExtractTakeaways).toHaveBeenCalledWith(
      "Needs takeaways content"
    );

    // Wait for extraction to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check state after successful extraction
    expect(result.current.error).toBeNull();
    expect(invalidateSpy).toHaveBeenCalled();

    // Simulate parent component refetching and passing updated article
    const updatedArticle: SerializedArticle = {
      ...articleNeedingTakeaways,
      takeaways: extractedTakeaways,
    };
    rerender({ article: updatedArticle });

    // Verify data now reflects the takeaways from the updated prop
    expect(result.current.data).toEqual(extractedTakeaways);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    invalidateSpy.mockRestore();
  });

  it("should handle extraction failure, update error state, and not call invalidateQueries", async () => {
    const articleNeedingTakeaways: SerializedArticle = {
      id: "3",
      content: "Content that fails",
      summary: "Summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const extractionError = new Error("Extraction failed");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    mockExtractTakeaways.mockImplementationOnce(() => {
      throw extractionError;
    });

    const { result } = renderHook(
      () => useArticleTakeaways(articleNeedingTakeaways),
      {
        wrapper,
      }
    );

    // Wait for extraction attempt
    expect(mockExtractTakeaways).toHaveBeenCalledTimes(1);
    expect(mockExtractTakeaways).toHaveBeenCalledWith("Content that fails");

    // Wait for failure handling
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check state after failure
    expect(result.current.data).toEqual([]); // No takeaways generated
    expect(result.current.error).toBe(extractionError); // Error state set
    expect(invalidateSpy).not.toHaveBeenCalled(); // Invalidate should not be called on error

    invalidateSpy.mockRestore();
  });

  it("should not trigger extraction again if already loading", async () => {
    const article: SerializedArticle = {
      id: "4",
      content: "Content",
      summary: "Summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Instead of making extractTakeaways async, make the mutation async
    let resolveMutation: (value: any) => void;
    mockExtractTakeaways.mockReturnValueOnce(["Finally done"]);
    mockMutateAsync.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        resolveMutation = resolve;
      });
    });

    const { result, rerender } = renderHook(
      ({ currentArticle }) => useArticleTakeaways(currentArticle),
      {
        initialProps: { currentArticle: article },
        wrapper,
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(mockExtractTakeaways).toHaveBeenCalledTimes(1);

    // Rerender with the *same* article while still loading
    rerender({ currentArticle: article });

    // Should still be loading, but extractTakeaways shouldn't be called again
    expect(result.current.loading).toBe(true);
    expect(mockExtractTakeaways).toHaveBeenCalledTimes(1);

    // Now resolve the mutation
    await act(async () => {
      resolveMutation({
        ...article,
        takeaways: ["Finally done"],
      });
      await Promise.resolve();
    });

    // Rerender with updated article
    rerender({ currentArticle: { ...article, takeaways: ["Finally done"] } });

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.data).toEqual(["Finally done"]));
  });

  it("should clear error state when a new article with existing takeaways is provided", async () => {
    const articleWithError: SerializedArticle = {
      id: "5",
      content: "Error content",
      summary: "Summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const extractionError = new Error("Initial fail");
    mockExtractTakeaways.mockImplementationOnce(() => {
      throw extractionError;
    });

    const { result, rerender } = renderHook(
      ({ currentArticle }) => useArticleTakeaways(currentArticle),
      {
        initialProps: { currentArticle: articleWithError },
        wrapper,
      }
    );

    // Wait for the error state
    await waitFor(() => expect(result.current.error).toBe(extractionError));
    expect(result.current.loading).toBe(false);

    // Now provide an article that already has takeaways
    const articleWithTakeaways: SerializedArticle = {
      id: "6",
      content: "Good content",
      summary: "Summary",
      takeaways: ["Already extracted"],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    rerender({ currentArticle: articleWithTakeaways });

    // Error should be cleared immediately, no loading triggered
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(["Already extracted"]);
    expect(mockExtractTakeaways).toHaveBeenCalledTimes(1); // Only called for the first article
  });

  it("should clear error state before starting a new extraction attempt", async () => {
    const articleWithError: SerializedArticle = {
      id: "7",
      content: "Error content 2",
      summary: "Summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const extractionError = new Error("Fail first");
    mockExtractTakeaways.mockImplementationOnce(() => {
      throw extractionError;
    });

    const { result, rerender } = renderHook(
      ({ currentArticle }) => useArticleTakeaways(currentArticle),
      {
        initialProps: { currentArticle: articleWithError },
        wrapper,
      }
    );

    // Wait for the error state
    await waitFor(() => expect(result.current.error).toBe(extractionError));
    expect(result.current.loading).toBe(false);
    expect(mockExtractTakeaways).toHaveBeenCalledTimes(1);

    // Now provide a new article that needs extraction
    const articleNeedsExtracting: SerializedArticle = {
      id: "8",
      content: "New content",
      summary: "Summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newTakeaways = ["Successful extraction"];
    mockExtractTakeaways.mockReturnValueOnce(newTakeaways);
    mockMutateAsync.mockImplementationOnce((_, options) => {
      if (options?.onSuccess) {
        options.onSuccess({
          ...articleNeedsExtracting,
          takeaways: newTakeaways,
        });
      }
      return Promise.resolve({
        ...articleNeedsExtracting,
        takeaways: newTakeaways,
      });
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    rerender({ currentArticle: articleNeedsExtracting });

    await waitFor(() => {
      expect(result.current.error).toBeNull(); // Error cleared
    });

    expect(mockExtractTakeaways).toHaveBeenCalledTimes(2); // Called again for article 8
    expect(mockExtractTakeaways).toHaveBeenCalledWith("New content");

    expect(result.current.error).toBeNull();
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    invalidateSpy.mockRestore();
  });
});
