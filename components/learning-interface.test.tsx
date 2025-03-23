import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  beforeAll,
  afterAll,
} from "vitest";
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

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

vi.mock("@tanstack/start", () => ({
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

  await sleep(0);
  await act(async () => {});

  return result;
}

describe("<LearningInterface />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerResponses.clear();

    mockServerResponses.set(
      `getOrCreateLearningMap-${mockSubject.id}`,
      mockLearningMap
    );
  });

  it("renders", async () => {
    await render(<LearningInterface subject={mockSubject} />);

    expect(document.body).toBeDefined();
  });

  it("passes the correct learning map to useRootArticle", async () => {
    const useRootArticleSpy = vi.spyOn(rootArticleHook, "useRootArticle");

    await render(<LearningInterface subject={mockSubject} />);

    expect(useRootArticleSpy).toHaveBeenCalledWith(mockLearningMap);
  });
});
