import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SerializedLearningMap } from "@/types/serialized";
import { useStableLearningMap } from "./use-stable-learning-map";

// Build minimal SerializedLearningMap for testing
const makeMap = (updatedAt: number): SerializedLearningMap => ({
  id: "map-1",
  subjectId: "sub-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date(updatedAt).toISOString(),
});

describe("useStableLearningMap", () => {
  it("reuses the same object when id & updatedAt stay constant", () => {
    const { result, rerender } = renderHook(({ m }) => useStableLearningMap(m), {
      initialProps: { m: makeMap(1) },
    });
    const first = result.current;
    rerender({ m: makeMap(1) });
    expect(result.current).toBe(first);
  });

  it("returns a new object when updatedAt changes", () => {
    const { result, rerender } = renderHook(({ m }) => useStableLearningMap(m), {
      initialProps: { m: makeMap(1) },
    });
    const first = result.current;
    rerender({ m: makeMap(2) });
    expect(result.current).not.toBe(first);
  });

  it("returns null if passed null", () => {
    const { result } = renderHook(() => useStableLearningMap(null));
    expect(result.current).toBeNull();
  });

  it("returns undefined if passed undefined", () => {
    const { result } = renderHook(() => useStableLearningMap(undefined));
    expect(result.current).toBeUndefined();
  });
});
