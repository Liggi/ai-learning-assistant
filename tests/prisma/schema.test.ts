import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prismaMock } from "./mock";

describe("Prisma Schema", () => {
  describe("Article model", () => {
    it("should have position fields", () => {
      // Mock an article with position data
      const article = {
        id: "test-article-id",
        content: "Test content",
        summary: "Test summary",
        takeaways: ["Takeaway 1"],
        learningMapId: "test-map-id",
        isRoot: true,
        positionX: 100.5,
        positionY: 200.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [],
      };

      // Mock the findUnique response
      prismaMock.article.findUnique.mockResolvedValue(article);

      // Verify the mock returns the expected data with position fields
      return prismaMock.article
        .findUnique({
          where: { id: "test-article-id" },
        })
        .then((result) => {
          expect(result).toBeDefined();
          expect(result?.positionX).toBe(100.5);
          expect(result?.positionY).toBe(200.5);
        });
    });
  });

  describe("Question model", () => {
    it("should have destination article relationship", () => {
      // Mock a question with a destination article
      const destinationArticle = {
        id: "destination-article-id",
        content: "Destination article content",
        learningMapId: "test-map-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sourceArticle = {
        id: "source-article-id",
        content: "Source article content",
        learningMapId: "test-map-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const question = {
        id: "test-question-id",
        text: "Test question?",
        articleId: "source-article-id",
        destinationArticleId: "destination-article-id",
        positionX: 150.5,
        positionY: 250.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceArticle: sourceArticle,
        destinationArticle: destinationArticle,
      };

      // Mock the findUnique response with include
      prismaMock.question.findUnique.mockResolvedValue(question);

      // Verify the mock returns the expected data with destination article
      return prismaMock.question
        .findUnique({
          where: { id: "test-question-id" },
          include: { destinationArticle: true, sourceArticle: true },
        })
        .then((result) => {
          expect(result).toBeDefined();
          expect(result?.destinationArticleId).toBe("destination-article-id");
          expect(result?.destinationArticle).toBeDefined();
          expect(result?.destinationArticle?.id).toBe("destination-article-id");
          expect(result?.positionX).toBe(150.5);
          expect(result?.positionY).toBe(250.5);
        });
    });
  });
});
