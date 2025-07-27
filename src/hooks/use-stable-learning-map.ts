import { useRef, useMemo } from "react";
import type { SerializedLearningMap } from "@/types/serialized";

/**
 * Returns the same map reference until its id or updatedAt change.
 */
export function useStableLearningMap(
  map: SerializedLearningMap | null | undefined
): SerializedLearningMap | null | undefined {
  const lastRef = useRef<{ key: string; map: SerializedLearningMap } | null>(
    null
  );
  const key = map ? `${map.id}-${new Date(map.updatedAt).getTime()}` : "";

  return useMemo(() => {
    if (!map) return map;
    if (lastRef.current?.key === key) {
      // nothing changed, reuse old reference
      return lastRef.current.map;
    }
    // version bumped, stash and return new
    lastRef.current = { key, map };
    return map;
  }, [map, key]);
}
