import { createServerFn } from "@tanstack/react-start";
import { generateSummaryPrompt } from "@/prompts/chat/summary";
import { robustLLMCall } from "@/lib/robust-llm-call";
import { extractJSON } from "@/features/llm-base";
import Anthropic from "@anthropic-ai/sdk";
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

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        baseURL: "https://anthropic.helicone.ai/",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-Type": "summary",
          "Helicone-Property-Article-Id": data.articleId,
        },
      });

      const response = await robustLLMCall(
        () =>
          anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          }),
        {
          provider: "anthropic",
          requestType: "summary",
          metadata: {
            articleId: data.articleId,
            contentLength: article.content.length,
          },
        }
      );

      const jsonString = extractJSON(response.content);
      const parsedResponse = JSON.parse(jsonString);
      const validatedResponse = summarySchema.parse(parsedResponse);

      logger.info(
        `Successfully generated summary: "${validatedResponse.summary}"`
      );

      const updatedArticle = await prisma.article.update({
        where: { id: data.articleId },
        data: {
          summary: validatedResponse.summary,
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
