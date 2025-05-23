import { createServerFn } from "@tanstack/react-start";
import { generateSummaryPrompt } from "@/prompts/chat/summary";
import { AnthropicProvider } from "../anthropic";
import { z } from "zod";
import { Logger } from "@/lib/logger";
import prisma from "@/prisma/client";
import { serializeArticle } from "@/types/serializers";

const logger = new Logger({ context: "ArticleSummary", enabled: false });

const summarySchema = z.object({
  summary: z.string(),
});

export const generateSummary = createServerFn({ method: "POST" })
  .validator((data: { articleId: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    try {
      // Fetch the article
      const article = await prisma.article.findUnique({
        where: { id: data.articleId },
      });

      if (!article) {
        throw new Error(`Article not found: ${data.articleId}`);
      }

      logger.info(`Generating summary for article: ${data.articleId}`);

      const prompt = generateSummaryPrompt({
        content: article.content,
      });

      const anthropicProvider = new AnthropicProvider();

      const response = await anthropicProvider.generateResponse(
        prompt,
        summarySchema,
        `summary_${data.articleId}`
      );

      logger.info(`Successfully generated summary: "${response.summary}"`);

      const updatedArticle = await prisma.article.update({
        where: { id: data.articleId },
        data: {
          summary: response.summary,
        },
      });

      return serializeArticle(updatedArticle);
    } catch (error) {
      logger.error("Error generating article summary:", error);

      if (error instanceof z.ZodError) {
        const missingFields = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new Error(`Invalid response structure from AI: ${missingFields}`);
      }

      throw new Error(
        `Failed to generate article summary: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
