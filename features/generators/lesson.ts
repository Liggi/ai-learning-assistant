import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callAnthropic } from "@/features/llm";
import { createPrompt } from "@/prompts/chat/lesson";

const stripResponsePlanning = (text: string): string => {
  return text
    .replace(/<response_planning>[\s\S]*?<\/response_planning>/g, "")
    .trim();
};

const lessonResponseSchema = z.object({
  response: z.string(),
});

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
      message: string;
    }) => data
  )
  .handler(async ({ data }) => {
    try {
      const prompt = createPrompt({
        subject: data.subject,
        moduleTitle: data.moduleTitle,
        moduleDescription: data.moduleDescription,
        message: data.message,
      });

      const result = await callAnthropic(prompt, lessonResponseSchema);

      const cleanedResponse = stripResponsePlanning(result.response);
      return { response: cleanedResponse };
    } catch (err) {
      console.error("Error in chat:", err);
      throw err;
    }
  });
