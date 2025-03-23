import { describe, it, expect, beforeEach } from "vitest";
import { atom, createStore } from "jotai";
import {
  learningMapIdAtom,
  activeArticleIdAtom,
  rootArticleIdAtom,
  questionContextAtom,
  articlesAtom,
  questionsAtom,
  flowNodesAtom,
  flowEdgesAtom,
  activeArticleAtom,
  rootArticleAtom,
  hasArticlesAtom,
  flowNeedsUpdateAtom,
  selectNodeAtom,
  initializeLearningMapAtom,
  addArticleAtom,
  updateArticleAtom,
  addQuestionAtom,
  updateFlowAtom,
  saveNodePositionsAtom,
} from "../../state/learning-map-state";

describe("Learning Map State Atoms", () => {
  // Create a clean store for each test
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  describe("Core Atoms", () => {
    it("should initialize with default values", () => {
      expect(store.get(learningMapIdAtom)).toBeNull();
      expect(store.get(activeArticleIdAtom)).toBeNull();
      expect(store.get(rootArticleIdAtom)).toBeNull();
      expect(store.get(questionContextAtom)).toBeNull();
      expect(store.get(articlesAtom)).toEqual([]);
      expect(store.get(questionsAtom)).toEqual([]);
      expect(store.get(flowNodesAtom)).toEqual([]);
      expect(store.get(flowEdgesAtom)).toEqual([]);
      expect(store.get(hasArticlesAtom)).toBe(false);
      expect(store.get(rootArticleAtom)).toBeNull();
      expect(store.get(activeArticleAtom)).toBeNull();
      expect(store.get(flowNeedsUpdateAtom)).toBe(true);
    });
  });

  describe("Derived Atoms", () => {
    it("should find active article", () => {
      const mockArticles = [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
        {
          id: "article2",
          isRoot: false,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      store.set(articlesAtom, mockArticles);
      store.set(activeArticleIdAtom, "article2");

      expect(store.get(activeArticleAtom)).toEqual(mockArticles[1]);
    });

    it("should find root article by rootArticleId", () => {
      const mockArticles = [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
        {
          id: "article2",
          isRoot: false,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      store.set(articlesAtom, mockArticles);
      store.set(rootArticleIdAtom, "article1");

      expect(store.get(rootArticleAtom)).toEqual(mockArticles[0]);
    });

    it("should find root article by isRoot flag when rootArticleId is not set", () => {
      const mockArticles = [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
        {
          id: "article2",
          isRoot: false,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      store.set(articlesAtom, mockArticles);

      expect(store.get(rootArticleAtom)).toEqual(mockArticles[0]);
    });

    it("should correctly indicate if there are articles", () => {
      expect(store.get(hasArticlesAtom)).toBe(false);

      store.set(articlesAtom, [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ]);

      expect(store.get(hasArticlesAtom)).toBe(true);
    });
  });

  describe("Action Atoms", () => {
    it("should select an article node", () => {
      const mockArticles = [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      store.set(articlesAtom, mockArticles);
      store.set(selectNodeAtom, "article1");

      expect(store.get(activeArticleIdAtom)).toBe("article1");
      expect(store.get(questionContextAtom)).toBeNull();
    });

    it("should select a question node with a destination article", () => {
      const mockArticles = [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
        {
          id: "article2",
          isRoot: false,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      const mockQuestions = [
        {
          id: "question1",
          text: "Test question",
          articleId: "article1",
          destinationArticleId: "article2",
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      store.set(articlesAtom, mockArticles);
      store.set(questionsAtom, mockQuestions);
      store.set(selectNodeAtom, "question1");

      expect(store.get(activeArticleIdAtom)).toBe("article2");
      expect(store.get(questionContextAtom)).toEqual({
        id: "question1",
        text: "Test question",
        sourceArticleId: "article1",
      });
    });

    it("should handle selecting a question node without a destination article", () => {
      const mockArticles = [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      const mockQuestions = [
        {
          id: "question1",
          text: "Test question",
          articleId: "article1",
          destinationArticleId: null,
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ];

      store.set(articlesAtom, mockArticles);
      store.set(questionsAtom, mockQuestions);
      store.set(selectNodeAtom, "question1");

      // activeArticleId should not change
      expect(store.get(activeArticleIdAtom)).toBeNull();
      // But questionContext should be set
      expect(store.get(questionContextAtom)).toEqual({
        id: "question1",
        text: "Test question",
        sourceArticleId: "article1",
      });
    });

    it("should initialize learning map", () => {
      const mockLearningMap = {
        id: "map1",
        subjectId: "subject1",
        createdAt: "",
        updatedAt: "",
        articles: [
          {
            id: "article1",
            isRoot: true,
            content: "",
            summary: "",
            takeaways: [],
            learningMapId: "map1",
            tooltips: {},
            questions: [
              {
                id: "question1",
                text: "Test question",
                articleId: "article1",
                destinationArticleId: null,
                createdAt: "",
                updatedAt: "",
                positionX: null,
                positionY: null,
              },
            ],
            answerToQuestions: [],
            createdAt: "",
            updatedAt: "",
            positionX: null,
            positionY: null,
          },
        ],
      };

      store.set(initializeLearningMapAtom, mockLearningMap);

      expect(store.get(learningMapIdAtom)).toBe("map1");
      expect(store.get(articlesAtom)).toHaveLength(1);
      expect(store.get(questionsAtom)).toHaveLength(1);
      expect(store.get(rootArticleIdAtom)).toBe("article1");
      expect(store.get(activeArticleIdAtom)).toBe("article1");
      expect(store.get(flowNeedsUpdateAtom)).toBe(true);
    });

    it("should add a new article", () => {
      const mockArticle = {
        id: "article1",
        isRoot: true,
        content: "",
        summary: "",
        takeaways: [],
        learningMapId: "map1",
        tooltips: {},
        questions: [],
        answerToQuestions: [],
        createdAt: "",
        updatedAt: "",
        positionX: null,
        positionY: null,
      };

      store.set(addArticleAtom, mockArticle);

      expect(store.get(articlesAtom)).toHaveLength(1);
      expect(store.get(articlesAtom)[0].id).toBe("article1");
      expect(store.get(rootArticleIdAtom)).toBe("article1");
      expect(store.get(flowNeedsUpdateAtom)).toBe(true);
    });

    it("should update an existing article", () => {
      // First add an article
      store.set(articlesAtom, [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ]);

      // Then update it
      store.set(updateArticleAtom, {
        id: "article1",
        content: "Updated content",
        summary: "Updated summary",
      });

      expect(store.get(articlesAtom)[0].content).toBe("Updated content");
      expect(store.get(articlesAtom)[0].summary).toBe("Updated summary");
      expect(store.get(flowNeedsUpdateAtom)).toBe(true);
    });

    it("should add a new question", () => {
      const mockQuestion = {
        id: "question1",
        text: "Test question",
        articleId: "article1",
        destinationArticleId: null,
        createdAt: "",
        updatedAt: "",
        positionX: null,
        positionY: null,
      };

      store.set(addQuestionAtom, mockQuestion);

      expect(store.get(questionsAtom)).toHaveLength(1);
      expect(store.get(questionsAtom)[0].id).toBe("question1");
      expect(store.get(flowNeedsUpdateAtom)).toBe(true);
    });

    it("should update flow visualization", () => {
      const mockNodes = [{ id: "node1", position: { x: 0, y: 0 }, data: {} }];
      const mockEdges = [{ id: "edge1", source: "node1", target: "node2" }];

      store.set(updateFlowAtom, { nodes: mockNodes, edges: mockEdges });

      expect(store.get(flowNodesAtom)).toEqual(mockNodes);
      expect(store.get(flowEdgesAtom)).toEqual(mockEdges);
      expect(store.get(flowNeedsUpdateAtom)).toBe(false);
    });

    it("should save node positions", () => {
      // Set up initial articles and questions
      store.set(articlesAtom, [
        {
          id: "article1",
          isRoot: true,
          content: "",
          summary: "",
          takeaways: [],
          learningMapId: "map1",
          tooltips: {},
          questions: [],
          answerToQuestions: [],
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ]);

      store.set(questionsAtom, [
        {
          id: "question1",
          text: "Test question",
          articleId: "article1",
          destinationArticleId: null,
          createdAt: "",
          updatedAt: "",
          positionX: null,
          positionY: null,
        },
      ]);

      // Save new positions
      store.set(saveNodePositionsAtom, {
        article1: { x: 100, y: 200 },
        question1: { x: 300, y: 400 },
      });

      // Check that positions were updated
      expect(store.get(articlesAtom)[0].positionX).toBe(100);
      expect(store.get(articlesAtom)[0].positionY).toBe(200);
      expect(store.get(questionsAtom)[0].positionX).toBe(300);
      expect(store.get(questionsAtom)[0].positionY).toBe(400);
    });
  });
});
