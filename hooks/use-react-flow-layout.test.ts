import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReactFlowLayout } from "./use-react-flow-layout";
import type { SerializedArticle, SerializedQuestion } from "@/types/serialized";

// Define the tree node types directly as they aren't exported
interface TreeArticleNode {
  id: string;
  type: "article";
  data: SerializedArticle;
  outgoingQuestions: TreeQuestionNode[];
}

interface TreeQuestionNode {
  id: string;
  type: "question";
  data: SerializedQuestion;
  childArticle: TreeArticleNode | null;
}

// --- Mock Serialized Data (similar to useLearningMapTree tests) ---
const mockArticle1: SerializedArticle = {
  id: "a1",
  content: "Article 1 Content",
  isRoot: true,
  learningMapId: "map1",
  createdAt: "date",
  updatedAt: "date",
  summary: "Summary A1",
  takeaways: [],
  tooltips: {},
  parentQuestion: undefined, // Assuming parent/child questions aren't needed for layout
  childQuestions: [],
};

const mockArticle2: SerializedArticle = {
  id: "a2",
  content: "Article 2 Content",
  isRoot: false,
  learningMapId: "map1",
  createdAt: "date",
  updatedAt: "date",
  summary: "Summary A2",
  takeaways: [],
  tooltips: {},
  parentQuestion: undefined,
  childQuestions: [],
};

const mockArticle3: SerializedArticle = {
  id: "a3",
  content: "Article 3 Content",
  isRoot: false,
  learningMapId: "map1",
  createdAt: "date",
  updatedAt: "date",
  summary: "Summary A3",
  takeaways: [],
  tooltips: {},
  parentQuestion: undefined,
  childQuestions: [],
};

const mockQuestion1_2: SerializedQuestion = {
  id: "q1",
  text: "Q1 Text",
  learningMapId: "map1",
  parentArticleId: "a1",
  childArticleId: "a2",
  createdAt: "date",
  updatedAt: "date",
};

const mockQuestion1_3: SerializedQuestion = {
  id: "q2",
  text: "Q2 Text",
  learningMapId: "map1",
  parentArticleId: "a1",
  childArticleId: "a3",
  createdAt: "date",
  updatedAt: "date",
};

const mockQuestionNoChild: SerializedQuestion = {
  id: "q-nochild",
  text: "Q No Child Text",
  learningMapId: "map1",
  parentArticleId: "a1",
  childArticleId: "a-nonexistent", // Points nowhere
  createdAt: "date",
  updatedAt: "date",
};

// --- Mock Tree Node Structures ---

// Single Article Tree
const singleArticleTree: TreeArticleNode = {
  id: "a1",
  type: "article",
  data: mockArticle1,
  outgoingQuestions: [],
};

// Linear Tree: A1 -> Q1 -> A2
const linearTree: TreeArticleNode = {
  id: "a1",
  type: "article",
  data: mockArticle1,
  outgoingQuestions: [
    {
      id: "q1",
      type: "question",
      data: mockQuestion1_2,
      childArticle: {
        id: "a2",
        type: "article",
        data: mockArticle2,
        outgoingQuestions: [],
      },
    },
  ],
};

// Branching Tree: A1 -> Q1 -> A2, A1 -> Q2 -> A3
const branchingTree: TreeArticleNode = {
  id: "a1",
  type: "article",
  data: mockArticle1,
  outgoingQuestions: [
    {
      id: "q1",
      type: "question",
      data: mockQuestion1_2,
      childArticle: {
        id: "a2",
        type: "article",
        data: mockArticle2,
        outgoingQuestions: [],
      },
    },
    {
      id: "q2",
      type: "question",
      data: mockQuestion1_3,
      childArticle: {
        id: "a3",
        type: "article",
        data: mockArticle3,
        outgoingQuestions: [],
      },
    },
  ],
};

// Tree with Dead End: A1 -> Q-NoChild -> null
const deadEndTree: TreeArticleNode = {
  id: "a1",
  type: "article",
  data: mockArticle1,
  outgoingQuestions: [
    {
      id: "q-nochild",
      type: "question",
      data: mockQuestionNoChild,
      childArticle: null, // Question leads nowhere
    },
  ],
};

// --- Test Suite ---

describe("useReactFlowLayout", () => {
  it("should return empty arrays if rootNode is null", () => {
    const { result } = renderHook(() => useReactFlowLayout(null));
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
  });

  it("should create a single article node for a single-node tree", () => {
    const { result } = renderHook(() => useReactFlowLayout(singleArticleTree));
    const { nodes, edges } = result.current;

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);

    expect(nodes[0]).toMatchObject({
      id: "article-a1",
      type: "conversationNode",
      data: {
        id: "a1",
        content: {
          summary: mockArticle1.summary,
          takeaways: mockArticle1.takeaways,
        },
        isUser: false,
      },
    });
  });

  it("should create nodes and edges for a linear tree (A1 -> Q1 -> A2)", () => {
    const { result } = renderHook(() => useReactFlowLayout(linearTree));
    const { nodes, edges } = result.current;

    // Nodes: article-a1, question-q1, article-a2
    expect(nodes).toHaveLength(3);
    expect(nodes.find((n) => n.id === "article-a1")).toBeDefined();
    expect(nodes.find((n) => n.id === "question-q1")).toBeDefined();
    expect(nodes.find((n) => n.id === "article-a2")).toBeDefined();

    // Check node types and basic data
    expect(nodes.find((n) => n.id === "article-a1")?.type).toBe(
      "conversationNode"
    );
    expect(nodes.find((n) => n.id === "question-q1")?.type).toBe(
      "questionNode"
    );
    expect(nodes.find((n) => n.id === "question-q1")?.data).toMatchObject({
      nodeType: "question",
      text: "Q1 Text",
    });
    expect(nodes.find((n) => n.id === "article-a2")?.type).toBe(
      "conversationNode"
    );
    expect(nodes.find((n) => n.id === "article-a2")?.data).toMatchObject({
      id: "a2",
      content: {
        summary: "Summary A2",
        takeaways: [],
      },
      isUser: false,
    });

    // Edges: article-a1 -> question-q1, question-q1 -> article-a2
    expect(edges).toHaveLength(2);
    expect(
      edges.find((e) => e.source === "article-a1" && e.target === "question-q1")
    ).toBeDefined();
    expect(
      edges.find((e) => e.source === "question-q1" && e.target === "article-a2")
    ).toBeDefined();
  });

  it("should create nodes and edges for a branching tree", () => {
    const { result } = renderHook(() => useReactFlowLayout(branchingTree));
    const { nodes, edges } = result.current;

    // Nodes: article-a1, question-q1, article-a2, question-q2, article-a3
    expect(nodes).toHaveLength(5);
    expect(nodes.find((n) => n.id === "article-a1")).toBeDefined();
    expect(nodes.find((n) => n.id === "question-q1")).toBeDefined();
    expect(nodes.find((n) => n.id === "article-a2")).toBeDefined();
    expect(nodes.find((n) => n.id === "question-q2")).toBeDefined();
    expect(nodes.find((n) => n.id === "article-a3")).toBeDefined();

    // Edges: a1->q1, q1->a2, a1->q2, q2->a3
    expect(edges).toHaveLength(4);
    expect(
      edges.find((e) => e.source === "article-a1" && e.target === "question-q1")
    ).toBeDefined();
    expect(
      edges.find((e) => e.source === "question-q1" && e.target === "article-a2")
    ).toBeDefined();
    expect(
      edges.find((e) => e.source === "article-a1" && e.target === "question-q2")
    ).toBeDefined();
    expect(
      edges.find((e) => e.source === "question-q2" && e.target === "article-a3")
    ).toBeDefined();
  });

  it("should handle questions with null child articles (dead ends)", () => {
    const { result } = renderHook(() => useReactFlowLayout(deadEndTree));
    const { nodes, edges } = result.current;

    // Nodes: article-a1, question-q-nochild
    expect(nodes).toHaveLength(2);
    expect(nodes.find((n) => n.id === "article-a1")).toBeDefined();
    expect(nodes.find((n) => n.id === "question-q-nochild")).toBeDefined();

    // Edges: article-a1 -> question-q-nochild (only one edge)
    expect(edges).toHaveLength(1);
    expect(
      edges.find(
        (e) => e.source === "article-a1" && e.target === "question-q-nochild"
      )
    ).toBeDefined();
    expect(
      edges.find((e) => e.source === "question-q-nochild")
    ).toBeUndefined(); // No outgoing edge from the question
  });
});
