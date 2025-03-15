import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LearningContextProvider } from "./context/learning-context";
import React from "react";

// Mock the server function
vi.mock("@/prisma/personal-learning-maps", () => ({
  getOrCreatePersonalLearningMap: vi.fn(),
}));

// Import the mocked function
import { getOrCreatePersonalLearningMap } from "@/prisma/personal-learning-maps";

// This is a simplified version of the hook we'll implement
const useLearningMapInitialization = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [mapId, setMapId] = React.useState<string | null>(null);

  // In the actual implementation, this will use React Query and the learning context
  React.useEffect(() => {
    const initializeMap = async () => {
      try {
        // Type assertion to avoid type errors with the mock
        const result = await (getOrCreatePersonalLearningMap as any)({
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
    <QueryClientProvider client={queryClient}>
      <LearningContextProvider subjectId="subject-1" moduleId="module-1">
        {children}
      </LearningContextProvider>
    </QueryClientProvider>
  );

  it("should initialize learning map successfully", async () => {
    // Mock successful response
    (getOrCreatePersonalLearningMap as any).mockResolvedValue({
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

    // Verify the server function was called with correct parameters
    expect(getOrCreatePersonalLearningMap).toHaveBeenCalledWith({
      subjectId: "subject-1",
      moduleId: "module-1",
    });
    expect(getOrCreatePersonalLearningMap).toHaveBeenCalledTimes(1);
  });

  it("should handle errors", async () => {
    // Mock error response
    (getOrCreatePersonalLearningMap as any).mockRejectedValue(
      new Error("API error")
    );

    render(<TestComponent />, { wrapper });

    // Wait for the effect to fail
    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
      expect(screen.getByText("Error: API error")).toBeInTheDocument();
    });

    // Verify the server function was called
    expect(getOrCreatePersonalLearningMap).toHaveBeenCalledTimes(1);
  });
});
