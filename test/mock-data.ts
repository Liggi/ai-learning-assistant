import type { SerializedArticle, SerializedQuestion } from "@/types/serialized";

// Mock articles for testing
export const mockArticles: SerializedArticle[] = [
  {
    id: "article1",
    content: "Test content for article 1",
    summary: "Summary of article 1",
    takeaways: ["Key point 1", "Key point 2"],
    questions: [],
    answerToQuestions: [],
    tooltips: {},
    positionX: 0,
    positionY: 0,
    isRoot: true,
    learningMapId: "map1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "article2",
    content: "Test content for article 2",
    summary: "Summary of article 2",
    takeaways: ["Key point 3", "Key point 4"],
    questions: [],
    answerToQuestions: [],
    tooltips: {},
    positionX: 200,
    positionY: 0,
    isRoot: false,
    learningMapId: "map1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock questions for testing
export const mockQuestions: SerializedQuestion[] = [
  {
    id: "question1",
    text: "What is the first topic?",
    articleId: "article1",
    destinationArticleId: null,
    positionX: 100,
    positionY: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "question2",
    text: "What is the second topic?",
    articleId: "article1",
    destinationArticleId: "article2",
    positionX: 100,
    positionY: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
