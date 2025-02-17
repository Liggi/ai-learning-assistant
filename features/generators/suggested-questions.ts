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
    try {
      const prompt = createPrompt(data);
      const response = await callAnthropic(prompt, suggestionsSchema);

      return { suggestions: response.questions };
    } catch (err) {
      console.error("Error generating suggestions:", err);
      throw err;
    }
  });
