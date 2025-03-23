import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  SerializedArticle,
  SerializedQuestion,
} from "../../types/serialized";
import {
  computeForceLayout,
  computeLayoutForNewNode,
  computePositionUpdates,
} from "../../utils/force-directed-layout";
import type { Node } from "reactflow";

// Mock d3-force to have more deterministic tests
vi.mock("d3-force", async () => {
  // Create mock simulation object that will be returned by forceSimulation
  const mockSimulation = {
    force: vi.fn().mockReturnThis(),
    tick: vi.fn(),
  };

  // Simple function to assign positions to nodes
  const assignPositions = (nodes) => {
    nodes.forEach((node, index) => {
      // If the node has fixed positions (fx/fy), use those
      if (node.fx !== undefined && node.fy !== undefined) {
        node.x = node.fx;
        node.y = node.fy;
      } else {
        // Otherwise assign positions in a grid
        node.x = (index % 3) * 200;
        node.y = Math.floor(index / 3) * 200;
      }
    });
    return mockSimulation;
  };

  // Create mock functions that return themselves to support chaining
  const createChainableMock = () => {
    // Create a function that has methods attached to it
    const mock = vi.fn(() => mock);

    // Add common chainable methods
    mock.id = vi.fn(() => mock);
    mock.distance = vi.fn(() => mock);
    mock.strength = vi.fn(() => mock);
    mock.radius = vi.fn(() => mock);

    return mock;
  };

  return {
    forceSimulation: vi.fn().mockImplementation(assignPositions),
    forceLink: vi.fn().mockImplementation(createChainableMock),
    forceManyBody: createChainableMock(),
    forceCenter: createChainableMock(),
    forceCollide: createChainableMock(),
  };
});

describe("Force Directed Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates empty nodes and edges for empty articles", () => {
    const result = computeForceLayout([], []);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("computes positions for a simple article with questions", () => {
    const questions: SerializedQuestion[] = [
      {
        id: "q1",
        text: "Question 1",
        articleId: "article1",
        destinationArticleId: null,
        positionX: null,
        positionY: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "q2",
        text: "Question 2",
        articleId: "article1",
        destinationArticleId: null,
        positionX: null,
        positionY: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const articles: SerializedArticle[] = [
      {
        id: "article1",
        content: "Test content",
        summary: "Test summary",
        takeaways: ["Takeaway 1"],
        tooltips: {},
        learningMapId: "test-map-id",
        isRoot: true,
        positionX: null,
        positionY: null,
        questions,
        answerToQuestions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = computeForceLayout(articles, questions);

    // Check nodes are created
    expect(result.nodes).toHaveLength(3); // 1 article + 2 questions

    // Check edges are created
    expect(result.edges).toHaveLength(2); // 2 article-to-question connections

    // Check node positions are calculated
    result.nodes.forEach((node) => {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe("number");
      expect(typeof node.position.y).toBe("number");
    });
  });

  it("respects existing positions from database", () => {
    const articles: SerializedArticle[] = [
      {
        id: "article1",
        content: "Test content",
        summary: "Test summary",
        takeaways: [],
        tooltips: {},
        learningMapId: "test-map-id",
        isRoot: true,
        positionX: 100,
        positionY: 200,
        questions: [],
        answerToQuestions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = computeForceLayout(articles, []);

    // With our mock simulation, it should keep the initial position
    const node = result.nodes[0];
    expect(node.position.x).toBe(100);
    expect(node.position.y).toBe(200);
  });

  it("creates edges for questions with destination articles", () => {
    const destinationArticle: SerializedArticle = {
      id: "dest-article",
      content: "Destination content",
      summary: "Destination summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "test-map-id",
      isRoot: false,
      positionX: 300,
      positionY: 300,
      questions: [],
      answerToQuestions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const question: SerializedQuestion = {
      id: "q1",
      text: "Test question",
      articleId: "article1",
      destinationArticleId: "dest-article",
      positionX: 200,
      positionY: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sourceArticle: SerializedArticle = {
      id: "article1",
      content: "Source content",
      summary: "Source summary",
      takeaways: [],
      tooltips: {},
      learningMapId: "test-map-id",
      isRoot: true,
      positionX: 100,
      positionY: 100,
      questions: [question],
      answerToQuestions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const articles = [sourceArticle, destinationArticle];
    const questions = [question];

    const result = computeForceLayout(articles, questions);

    // Check all nodes are created
    expect(result.nodes).toHaveLength(3); // 2 articles + 1 question

    // Check edges are created
    expect(result.edges).toHaveLength(2); // 1 article-to-question + 1 question-to-article

    // Check specific edges
    const articleToQuestion = result.edges.find(
      (e) => e.source === "article1" && e.target === "q1"
    );
    expect(articleToQuestion).toBeDefined();

    const questionToDestination = result.edges.find(
      (e) => e.source === "q1" && e.target === "dest-article"
    );
    expect(questionToDestination).toBeDefined();
  });

  it("sets isActive flag correctly for the active article", () => {
    const articles: SerializedArticle[] = [
      {
        id: "article1",
        content: "Test content 1",
        summary: "Summary 1",
        takeaways: [],
        tooltips: {},
        learningMapId: "test-map-id",
        isRoot: true,
        positionX: 100,
        positionY: 100,
        questions: [],
        answerToQuestions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "article2",
        content: "Test content 2",
        summary: "Summary 2",
        takeaways: [],
        tooltips: {},
        learningMapId: "test-map-id",
        isRoot: false,
        positionX: 300,
        positionY: 300,
        questions: [],
        answerToQuestions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = computeForceLayout(articles, [], {
      activeArticleId: "article2",
    });

    // Find active and inactive nodes
    const activeNode = result.nodes.find((node) => node.id === "article2");
    const inactiveNode = result.nodes.find((node) => node.id === "article1");

    expect(activeNode?.data.isActive).toBe(true);
    expect(inactiveNode?.data.isActive).toBe(false);
  });

  it("computes layout for a new node with connections to existing nodes", () => {
    // Create existing nodes and edges
    const existingNodes: Node[] = [
      {
        id: "article1",
        type: "conversationNode",
        position: { x: 100, y: 100 },
        data: { id: "article1" },
      },
      {
        id: "q1",
        type: "questionNode",
        position: { x: 300, y: 100 },
        data: { id: "q1", text: "Test question" },
      },
    ];

    const existingEdges = [
      {
        id: "article1-q1",
        source: "article1",
        target: "q1",
        type: "smoothstep",
      },
    ];

    // New node to add
    const newNodeData = {
      id: "article2",
      type: "conversationNode" as const,
      data: {
        id: "article2",
        content: { summary: "New article", takeaways: [] },
        isUser: false,
        isLoading: false,
      },
    };

    // Connections for the new node
    const connections = [{ source: "q1", target: "article2" }];

    // Compute the new layout
    const result = computeLayoutForNewNode(
      existingNodes,
      existingEdges,
      newNodeData,
      connections
    );

    // Check that all nodes are present
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.some((n) => n.id === "article2")).toBe(true);

    // Check that the new edge is created
    expect(result.edges).toHaveLength(2);
    const newEdge = result.edges.find(
      (e) => e.source === "q1" && e.target === "article2"
    );
    expect(newEdge).toBeDefined();
  });

  it("generates position updates for database saving", () => {
    const nodes: Node[] = [
      {
        id: "article1",
        type: "conversationNode",
        position: { x: 100, y: 200 },
        data: {},
      },
      {
        id: "q1",
        type: "questionNode",
        position: { x: 300, y: 400 },
        data: {},
      },
    ];

    const updates = computePositionUpdates(nodes);

    expect(updates).toHaveLength(2);
    expect(updates).toEqual([
      { id: "article1", type: "article", x: 100, y: 200 },
      { id: "q1", type: "question", x: 300, y: 400 },
    ]);
  });
});
