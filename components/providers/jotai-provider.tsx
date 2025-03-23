import { Provider } from "jotai/react";
import React, { ReactNode } from "react";

interface JotaiProviderProps {
  children: ReactNode;
}

/**
 * Provides Jotai state management to all children components
 */
export function JotaiProvider({ children }: JotaiProviderProps) {
  return <Provider>{children}</Provider>;
}
