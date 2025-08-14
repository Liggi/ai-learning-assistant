import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  SerializedArticle,
  SerializedLearningMap,
  SerializedQuestion,
} from "@/types/serialized";
import { useLearningMapTree } from "./use-learning-map-tree";

// --- Mock Data ---

const mockArticle1: SerializedArticle = {
  id: "a1",
  content: "Article 1",
  isRoot: true, // Implicitly root in the simple case
  learningMapId: "map1",
  createdAt: "date",
  updatedAt: "date",
  summary: "",
  takeaways: [],
  tooltips: {},
};

const mockArticle2: SerializedArticle = {
  id: "a2",
  content: "Article 2",
  isRoot: false,
  learningMapId: "map1",
  createdAt: "date",
  updatedAt: "date",
  summary: "",
  takeaways: [],
  tooltips: {},
};

const mockArticle3: SerializedArticle = {
  id: "a3",
  content: "Article 3",
  isRoot: false,
  learningMapId: "map1",
  createdAt: "date",
  updatedAt: "date",
  summary: "",
  takeaways: [],
  tooltips: {},
};

const mockQuestion1_2: SerializedQuestion = {
  id: "q1",
  text: "Q1",
  learningMapId: "map1",
  parentArticleId: "a1",
  childArticleId: "a2",
  createdAt: "date",
  updatedAt: "date",
};

const mockQuestion1_3: SerializedQuestion = {
  id: "q2",
  text: "Q2",
  learningMapId: "map1",
  parentArticleId: "a1",
  childArticleId: "a3",
  createdAt: "date",
  updatedAt: "date",
};

const mockQuestion2_1_Cycle: SerializedQuestion = {
  id: "q3",
  text: "Q3 Cycle",
  learningMapId: "map1",
  parentArticleId: "a2",
  childArticleId: "a1", // Creates a cycle
  createdAt: "date",
  updatedAt: "date",
};

// --- Test Suite ---

describe("useLearningMapTree", () => {
  it("should return null if learningMap is null or undefined", () => {
    const { result: resultNull } = renderHook(() => useLearningMapTree(null));
    expect(resultNull.current).toBeNull();

    const { result: resultUndefined } = renderHook(() => useLearningMapTree(undefined));
    expect(resultUndefined.current).toBeNull();
  });

  it("should return null if learningMap has no articles", () => {
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [],
      questions: [mockQuestion1_2],
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));
    expect(result.current).toBeNull();
  });

  it("should return null if learningMap has no questions (and multiple articles)", () => {
    // If there are no questions, it's impossible to determine the root or structure
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1, mockArticle2],
      questions: [],
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));
    expect(result.current).toBeNull();
  });

  it("should build a simple linear tree (A1 -> Q1 -> A2)", () => {
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1, mockArticle2],
      questions: [mockQuestion1_2],
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));

    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe("a1");
    expect(result.current?.type).toBe("article");
    expect(result.current?.data).toEqual(mockArticle1);
    expect(result.current?.outgoingQuestions).toHaveLength(1);

    const questionNode = result.current?.outgoingQuestions[0];
    expect(questionNode?.id).toBe("q1");
    expect(questionNode?.type).toBe("question");
    expect(questionNode?.data).toEqual(mockQuestion1_2);
    expect(questionNode?.childArticle).not.toBeNull();
    expect(questionNode?.childArticle?.id).toBe("a2");
    expect(questionNode?.childArticle?.data).toEqual(mockArticle2);
    expect(questionNode?.childArticle?.outgoingQuestions).toHaveLength(0); // A2 has no outgoing questions
  });

  it("should build a branching tree (A1 -> Q1 -> A2, A1 -> Q2 -> A3)", () => {
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1, mockArticle2, mockArticle3],
      questions: [mockQuestion1_2, mockQuestion1_3],
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));

    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe("a1");
    expect(result.current?.outgoingQuestions).toHaveLength(2);

    // Check branch 1 (A1 -> Q1 -> A2)
    const questionNode1 = result.current?.outgoingQuestions.find((q) => q.id === "q1");
    expect(questionNode1).toBeDefined();
    expect(questionNode1?.childArticle?.id).toBe("a2");
    expect(questionNode1?.childArticle?.data).toEqual(mockArticle2);
    expect(questionNode1?.childArticle?.outgoingQuestions).toHaveLength(0);

    // Check branch 2 (A1 -> Q2 -> A3)
    const questionNode2 = result.current?.outgoingQuestions.find((q) => q.id === "q2");
    expect(questionNode2).toBeDefined();
    expect(questionNode2?.childArticle?.id).toBe("a3");
    expect(questionNode2?.childArticle?.data).toEqual(mockArticle3);
    expect(questionNode2?.childArticle?.outgoingQuestions).toHaveLength(0);
  });

  it("should return null if no root article is found", () => {
    // Make A1 also a child article
    const questionLinkingToA1: SerializedQuestion = {
      ...mockQuestion1_2,
      id: "q-link-a1",
      childArticleId: "a1",
      parentArticleId: "a2",
    };
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1, mockArticle2],
      // A1 points to A2, A2 points to A1 -> no clear root
      questions: [mockQuestion1_2, questionLinkingToA1],
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));
    // We expect an error log in this case, but the hook should return null
    expect(result.current).toBeNull();
  });

  it("should return null for circular dependencies (A1 -> Q1 -> A2 -> Q3 -> A1)", () => {
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1, mockArticle2],
      questions: [mockQuestion1_2, mockQuestion2_1_Cycle], // A1->A2, A2->A1
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));

    // In a fully circular graph, there's no clear root article
    // (every article is pointed to by some question)
    expect(result.current).toBeNull();
  });

  it("should handle questions pointing to non-existent child articles", () => {
    const questionToNowhere: SerializedQuestion = {
      ...mockQuestion1_2,
      id: "q-nowhere",
      childArticleId: "a-nonexistent",
    };
    const learningMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1], // Only A1 exists
      questions: [questionToNowhere],
    };
    const { result } = renderHook(() => useLearningMapTree(learningMap));

    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe("a1");
    expect(result.current?.outgoingQuestions).toHaveLength(1);

    const questionNode = result.current?.outgoingQuestions[0];
    expect(questionNode?.id).toBe("q-nowhere");
    // Child article should be null because 'a-nonexistent' is not in articlesMap
    expect(questionNode?.childArticle).toBeNull();
  });

  it("should update the tree when the learningMap input changes", () => {
    const initialMap: SerializedLearningMap = {
      id: "map1",
      subjectId: "sub1",
      createdAt: "date",
      updatedAt: "date",
      articles: [mockArticle1, mockArticle2],
      questions: [mockQuestion1_2],
    };
    const { result, rerender } = renderHook(({ map }) => useLearningMapTree(map), {
      initialProps: { map: initialMap },
    });

    // Initial state check
    expect(result.current?.id).toBe("a1");
    expect(result.current?.outgoingQuestions).toHaveLength(1);
    expect(result.current?.outgoingQuestions[0]?.childArticle?.id).toBe("a2");

    // New map with an additional branch
    const updatedMap: SerializedLearningMap = {
      ...initialMap,
      articles: [...initialMap.articles!, mockArticle3],
      questions: [...initialMap.questions!, mockQuestion1_3], // Add Q1 -> A3
    };

    rerender({ map: updatedMap });

    // Updated state check
    expect(result.current?.id).toBe("a1");
    expect(result.current?.outgoingQuestions).toHaveLength(2); // Now has two questions
    const questionNode1 = result.current?.outgoingQuestions.find((q) => q.id === "q1");
    const questionNode2 = result.current?.outgoingQuestions.find((q) => q.id === "q2");
    expect(questionNode1?.childArticle?.id).toBe("a2");
    expect(questionNode2?.childArticle?.id).toBe("a3");
  });
});
