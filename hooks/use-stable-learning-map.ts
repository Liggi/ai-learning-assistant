import { useRef } from "react";
import { SerializedLearningMap } from "@/types/serialized";

/**
 * Returns a stable reference to the learning map as long as its id and updatedAt don't change.
 */
export function useStableLearningMap<
  T extends SerializedLearningMap | null | undefined,
>(map: T): T {
  const ref = useRef<T>(map);

  if (
    map &&
    ref.current &&
    (ref.current.id !== map.id ||
      ref.current.updatedAt !== (map as any).updatedAt)
  ) {
    ref.current = map;
  }

  return ref.current;
}
