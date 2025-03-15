# Testing Plan for Learning Context Refactoring

## Overview

Before refactoring the learning context architecture, we'll implement tests to ensure we don't break existing functionality. This document outlines our testing approach, focusing on client-side testing that provides real value.

## Testing Approach

We'll use Vitest as our testing framework with React Testing Library for component testing. Tests will be co-located with their implementation using the `component.test.tsx` naming convention.

## Test Categories

### 1. Reducer Tests

Test the state machine reducer in isolation to ensure state transitions work correctly.

```typescript
// hooks/context/learning-context.test.ts
import { describe, it, expect } from "vitest";
import { learningReducer, initialState } from "./learning-context";

describe("Learning Reducer", () => {
  it("should initialize learning context with subject and module IDs", () => {
    const action = {
      type: "INITIALISE_LEARNING_CONTEXT",
      payload: { subjectId: "subject-1", moduleId: "module-1" },
    };

    const newState = learningReducer(initialState, action);

    expect(newState.subjectId).toBe("subject-1");
    expect(newState.moduleId).toBe("module-1");
    expect(newState.status).toBe("IDLE");
  });

  it("should transition to INITIALISING_LEARNING_MAP state", () => {
    const state = {
      ...initialState,
      subjectId: "subject-1",
      moduleId: "module-1",
    };

    const action = { type: "INITIALISE_LEARNING_MAP_STARTED" };
    const newState = learningReducer(state, action);

    expect(newState.status).toBe("INITIALISING_LEARNING_MAP");
    expect(newState.error).toBeNull();
  });

  it("should transition to READY state with map ID", () => {
    const state = {
      ...initialState,
      status: "INITIALISING_LEARNING_MAP",
      subjectId: "subject-1",
      moduleId: "module-1",
    };

    const action = {
      type: "INITIALISE_LEARNING_MAP_FINISHED",
      payload: { personalLearningMapId: "map-1" },
    };

    const newState = learningReducer(state, action);

    expect(newState.status).toBe("READY");
    expect(newState.personalLearningMapId).toBe("map-1");
  });

  it("should set error state", () => {
    const state = {
      ...initialState,
      status: "INITIALISING_LEARNING_MAP",
    };

    const action = {
      type: "SET_ERROR",
      payload: { message: "Test error" },
    };

    const newState = learningReducer(state, action);

    expect(newState.error).toBe("Test error");
  });

  it("should reset state", () => {
    const state = {
      status: "READY",
      articleContent: "Some content",
      personalLearningMapId: "map-1",
      error: null,
      subjectId: "subject-1",
      moduleId: "module-1",
    };

    const action = { type: "RESET" };
    const newState = learningReducer(state, action);

    expect(newState).toEqual(initialState);
  });
});
```

### 2. Hook Integration Tests

Test the custom hooks with mocked server functions. This approach allows us to verify client-side behavior without relying on actual server implementation.

```typescript
// hooks/useLearningMapInitialization.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock the server function that will be created
vi.mock("@/prisma/personal-learning-maps", () => ({
  getOrCreatePersonalLearningMap: vi.fn(),
}));

// Import the mocked function
import { getOrCreatePersonalLearningMap } from "@/prisma/personal-learning-maps";

// The actual hook we'll implement
const useLearningMapInitialization = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [mapId, setMapId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initializeMap = async () => {
      try {
        const result = await getOrCreatePersonalLearningMap({
          subjectId: "subject-1",
          moduleId: "module-1",
        });
        setMapId(result.id);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    initializeMap();
  }, []);

  return { isLoading, error, mapId };
};

// Test component that uses our hook
function TestComponent() {
  const { isLoading, error, mapId } = useLearningMapInitialization();

  if (error) {
    return <div data-testid="error">Error: {error.message}</div>;
  }

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return <div data-testid="success">Map ID: {mapId}</div>;
}

describe("useLearningMapInitialization", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.resetAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should initialize learning map successfully", async () => {
    // Mock successful response
    (getOrCreatePersonalLearningMap as jest.Mock).mockResolvedValue({
      id: "map-1",
      curriculumMapId: "curriculum-1",
      moduleId: "module-1",
    });

    render(<TestComponent />, { wrapper });

    // Initial state should be loading
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Wait for the effect to complete
    await waitFor(() => {
      expect(screen.getByTestId("success")).toBeInTheDocument();
      expect(screen.getByText("Map ID: map-1")).toBeInTheDocument();
    });
  });

  it("should handle errors", async () => {
    // Mock error response
    (getOrCreatePersonalLearningMap as jest.Mock).mockRejectedValue(new Error("API error"));

    render(<TestComponent />, { wrapper });

    // Wait for the effect to fail
    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
      expect(screen.getByText("Error: API error")).toBeInTheDocument();
    });
  });
});
```

### 3. Component Integration Tests

Test the components that use the learning context to ensure they render correctly in different states.

```typescript
// components/LearningMap.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LearningContextProvider } from '../hooks/context/learning-context';
import { LearningMap } from './LearningMap';

// Mock the server function
vi.mock('@/prisma/personal-learning-maps', () => ({
  getOrCreatePersonalLearningMap: vi.fn(),
  getMapNodes: vi.fn(),
}));

// Import the mocked functions
import { getOrCreatePersonalLearningMap, getMapNodes } from '@/prisma/personal-learning-maps';

describe('LearningMap', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.resetAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <LearningContextProvider subjectId="subject-1" moduleId="module-1">
        {children}
      </LearningContextProvider>
    </QueryClientProvider>
  );

  it('should render loading state initially', async () => {
    // Mock pending state for map initialization
    (getOrCreatePersonalLearningMap as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(<LearningMap />, { wrapper });

    // Check for loading indicator
    expect(screen.getByTestId('map-loading')).toBeInTheDocument();
  });

  it('should render map when data is loaded', async () => {
    // Mock successful responses
    (getOrCreatePersonalLearningMap as jest.Mock).mockResolvedValue({
      id: 'map-1',
      curriculumMapId: 'curriculum-1',
      moduleId: 'module-1',
    });

    (getMapNodes as jest.Mock).mockResolvedValue([
      { id: 'node-1', type: 'concept', position: { x: 100, y: 100 }, data: { label: 'Concept 1' } },
      { id: 'node-2', type: 'concept', position: { x: 300, y: 100 }, data: { label: 'Concept 2' } },
    ]);

    render(<LearningMap />, { wrapper });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('map-loading')).not.toBeInTheDocument();
    });

    // Check for map nodes
    expect(screen.getByText('Concept 1')).toBeInTheDocument();
    expect(screen.getByText('Concept 2')).toBeInTheDocument();
  });

  it('should handle errors', async () => {
    // Mock error response
    (getOrCreatePersonalLearningMap as jest.Mock).mockRejectedValue(
      new Error('Failed to load map')
    );

    render(<LearningMap />, { wrapper });

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByTestId('map-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load map/i)).toBeInTheDocument();
    });
  });
});
```

## Setup Instructions

1. Add testing dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

2. Update package.json scripts:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

3. Create a vitest.config.ts file:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
```

4. Create a vitest.setup.ts file:

```typescript
import "@testing-library/jest-dom";
```

## Test Execution Strategy

1. Run the tests before refactoring to establish a baseline
2. Make incremental changes and run tests after each change
3. If tests fail, revert or fix the issue before continuing
4. Once all tests pass with the new implementation, the refactoring is complete

## Benefits of Client-Side Testing

1. **Faster Execution**: Client-side tests run faster without database dependencies
2. **Isolation**: Tests focus on UI behavior without server implementation details
3. **Stability**: Tests are less brittle since they don't depend on server-side code
4. **Maintainability**: Easier to maintain as server implementations change

## Mocking Strategy

- Mock server functions at the module boundary
- Use deterministic mock responses for predictable tests
- Test both success and error paths
- Verify UI state transitions during async operations

## Conclusion

This testing approach will provide confidence during the refactoring process by ensuring that:

1. The state machine transitions work correctly
2. The client-side hooks handle server responses properly
3. The UI components render correctly in different states

By focusing on these key areas and keeping tests close to their implementation, we can refactor the architecture while maintaining the existing functionality.
