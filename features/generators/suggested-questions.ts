import { z } from "zod";
import { callAnthropic } from "@/features/llm";
import { createPrompt } from "@/prompts/chat/suggested-questions";
import { createServerFn } from "@tanstack/start";

const suggestionsSchema = z.object({
  questions: z.array(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
      currentMessage: string;
    }) => {
      return data;
    }
  )
  .handler(async ({ data }) => {
    const requestId = `question_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      console.log(`[${requestId}] Question generator called with data:`, {
        subject: data.subject,
        moduleTitle: data.moduleTitle,
        contentLength: data.currentMessage.length,
      });

      const prompt = createPrompt(data);
      console.log(
        `[${requestId}] Generated question prompt:`,
        prompt.substring(0, 200) + "..."
      );

      console.log(
        `[${requestId}] Calling Anthropic API for question generation`
      );
      const response = await callAnthropic(
        prompt,
        suggestionsSchema,
        requestId
      );
      console.log(
        `[${requestId}] Anthropic API response received, questions count:`,
        response.questions.length
      );

      return { suggestions: response.questions };
    } catch (err) {
      console.error(`[${requestId}] Error generating suggestions:`, err);
      throw err;
    }
  });
