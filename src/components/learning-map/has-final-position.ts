import type { MapNode } from "./types";

/**
 * Type-guard that detects if a React-Flow node carries an optional
 * `finalPosition` field.  Keeps runtime checks and TS narrowing portable.
 */
export function hasFinalPosition(node: unknown): node is MapNode & {
  finalPosition?: { x: number; y: number };
} {
  return (
    typeof node === "object" &&
    node !== null &&
    "position" in node &&
    "id" in node &&
    "finalPosition" in (node as Record<string, unknown>)
  );
}
