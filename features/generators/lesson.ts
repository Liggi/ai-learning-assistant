import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AnthropicProvider } from "@/features/anthropic";
import { createPrompt } from "@/prompts/chat/lesson";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "LessonGenerator" });

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

      const anthropicProvider = new AnthropicProvider();
      const result = await anthropicProvider.generateResponse(
        prompt,
        lessonResponseSchema,
        `lesson_${data.subject}_${data.moduleTitle}`,
        {
          heliconeMetadata: {
            type: "lesson",
            subject: data.subject,
          },
        }
      );

      const cleanedResponse = stripResponsePlanning(result.response);
      return { response: cleanedResponse };
    } catch (err) {
      logger.error("Error in chat:", err);
      throw err;
    }
  });
