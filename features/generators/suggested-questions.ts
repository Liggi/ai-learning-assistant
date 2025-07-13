import { z } from "zod";
import { AnthropicProvider } from "@/features/anthropic";
import { createPrompt } from "@/prompts/chat/suggested-questions";
import { createServerFn } from "@tanstack/react-start";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "SuggestedQuestionsGenerator" });

const suggestionsSchema = z.object({
  questions: z.array(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator((data: { subject: string; currentMessage: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    const requestId = `question_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      logger.info(`[${requestId}] Question generator called with data:`, {
        subject: data.subject,
        contentLength: data.currentMessage.length,
      });

      const prompt = createPrompt(data);
      logger.info(
        `[${requestId}] Generated question prompt:`,
        prompt.substring(0, 200) + "..."
      );

      logger.info(
        `[${requestId}] Calling Anthropic API for question generation`
      );
      const anthropicProvider = new AnthropicProvider();
      const response = await anthropicProvider.generateResponse(
        prompt,
        suggestionsSchema,
        requestId,
        {
          heliconeMetadata: {
            type: "questions",
            subject: data.subject,
          },
        }
      );
      logger.info(
        `[${requestId}] Anthropic API response received, questions count:`,
        response.questions.length
      );

      return { suggestions: response.questions };
    } catch (err) {
      logger.error(`[${requestId}] Error generating suggestions:`, err);
      throw err;
    }
  });
