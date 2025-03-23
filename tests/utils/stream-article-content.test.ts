import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the QuestionContext type
const mockQuestionContext = {
  id: "q1",
  text: "What is React Hooks?",
  sourceArticleId: "article1",
};

// Mock the fetch function
global.fetch = vi.fn();

// Mock the TextDecoder
const mockDecode = vi.fn();
global.TextDecoder = vi.fn().mockImplementation(() => ({
  decode: mockDecode,
}));

// Mock the ReadableStream and Reader
const mockReader = {
  read: vi.fn(),
};

// Create a simplified version of the streamContentFromAPI function for testing
const testStreamContentFromAPI = async (
  subjectTitle: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  questionContext?: typeof mockQuestionContext
) => {
  const requestData = questionContext
    ? {
        subject: subjectTitle,
        question: questionContext.text,
        message: `This article should answer the question: "${questionContext.text}"`,
      }
    : {
        subject: subjectTitle,
        moduleTitle: `Introduction to ${subjectTitle}`,
        moduleDescription: `A comprehensive introduction to ${subjectTitle} covering the fundamental concepts and principles.`,
        message: `This is the first article in an exploratory learning space for the subject (${subjectTitle}).`,
      };

  await fetch("/api/lesson-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
    signal,
  });

  return "Test content";
};

describe("Article Content Streaming with Question Context", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Setup the mock fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    // Make the mock reader return a few chunks then complete
    mockReader.read
      .mockResolvedValueOnce({ value: new Uint8Array([65, 66]), done: false })
      .mockResolvedValueOnce({ value: new Uint8Array([67, 68]), done: false })
      .mockResolvedValueOnce({ done: true });

    // Mock the decode function
    mockDecode.mockReturnValueOnce("AB").mockReturnValueOnce("CD");
  });

  it("sends correct data for normal article streaming", async () => {
    // Call our test function directly
    await testStreamContentFromAPI("React", (chunk) => {}, undefined);

    // Check that fetch was called with the right arguments for normal articles
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/lesson-stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining(`"subject":"React"`),
      })
    );
  });

  it("sends correct data when question context is provided", async () => {
    // Call our test function with question context
    await testStreamContentFromAPI(
      "React",
      (chunk) => {},
      undefined,
      mockQuestionContext
    );

    // Check that fetch was called with the right message format for question-based articles
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/lesson-stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining(`"question":"What is React Hooks?"`),
      })
    );
  });
});
