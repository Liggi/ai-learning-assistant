import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractJSON } from "@/features/llm-base";
import { Logger } from "@/lib/logger";
import { robustLLMCall } from "@/lib/robust-llm-call";
import { createPrompt } from "@/prompts/chat/suggested-questions";

const logger = new Logger({ context: "SuggestedQuestionsGenerator", enabled: false });

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
      logger.info(`[${requestId}] Generated question prompt:`, `${prompt.substring(0, 200)}...`);

      logger.info(`[${requestId}] Calling Anthropic API for question generation`);

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        baseURL: "https://anthropic.helicone.ai/",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-Type": "questions",
          "Helicone-Property-Subject": data.subject,
        },
      });

      const response = await robustLLMCall(
        () =>
          anthropic.messages.create({
            model: "claude-3-7-sonnet-latest",
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
          }),
        {
          provider: "anthropic",
          requestType: "questions",
          metadata: {
            subject: data.subject,
            contentLength: data.currentMessage.length,
          },
        }
      );

      const jsonString = extractJSON(response.content);
      const parsedResponse = JSON.parse(jsonString);
      const validatedResponse = suggestionsSchema.parse(parsedResponse);

      logger.info(
        `[${requestId}] Anthropic API response received, questions count:`,
        validatedResponse.questions.length
      );

      return { suggestions: validatedResponse.questions };
    } catch (err) {
      logger.error(`[${requestId}] Error generating suggestions:`, err);
      throw err;
    }
  });
