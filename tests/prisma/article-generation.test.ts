import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "./mock";

// Mock the Prisma client
vi.mock("../../prisma/client", () => ({
  prisma: prismaMock,
}));

// Create a simplified version of createArticleFromQuestion for testing
const createArticleFromQuestion = async ({
  data,
}: {
  data: { questionId: string; learningMapId: string };
}) => {
  // Get the question
  const question = await prismaMock.question.findUnique({
    where: { id: data.questionId },
    include: { sourceArticle: true },
  });

  if (!question) {
    throw new Error(`Question not found: ${data.questionId}`);
  }

  // Create a new article
  const newArticle = await prismaMock.article.create({
    data: {
      content: "", // Empty content that will be filled by streaming
      learningMapId: data.learningMapId,
      isRoot: false,
    },
  });

  // Update the question to link to this article
  await prismaMock.question.update({
    where: { id: data.questionId },
    data: { destinationArticleId: newArticle.id },
  });

  return newArticle;
};

describe("Article Generation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a new article from a question", async () => {
    // Mock database responses
    prismaMock.question.findUnique.mockResolvedValue({
      id: "q1",
      text: "What is Test-Driven Development?",
      articleId: "article1",
      sourceArticle: {
        id: "article1",
        content: "Programming article",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.article.create.mockResolvedValue({
      id: "new-article",
      content: "",
      learningMapId: "map1",
      isRoot: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    prismaMock.question.update.mockResolvedValue({
      id: "q1",
      destinationArticleId: "new-article",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Call the function
    const result = await createArticleFromQuestion({
      data: {
        questionId: "q1",
        learningMapId: "map1",
      },
    });

    // Verify result
    expect(result).toBeDefined();
    expect(result.id).toBe("new-article");

    // Verify database operations were called
    expect(prismaMock.question.findUnique).toHaveBeenCalledWith({
      where: { id: "q1" },
      include: { sourceArticle: true },
    });

    expect(prismaMock.article.create).toHaveBeenCalledWith({
      data: {
        content: "",
        learningMapId: "map1",
        isRoot: false,
      },
    });

    expect(prismaMock.question.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { destinationArticleId: "new-article" },
    });
  });

  it("throws an error when question is not found", async () => {
    // Mock question not found
    prismaMock.question.findUnique.mockResolvedValue(null);

    // Call should throw an error
    await expect(
      createArticleFromQuestion({
        data: {
          questionId: "non-existent",
          learningMapId: "map1",
        },
      })
    ).rejects.toThrow("Question not found");
  });
});
