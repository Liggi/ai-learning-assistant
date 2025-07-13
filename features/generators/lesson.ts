import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { robustLLMCall } from "@/lib/robust-llm-call";
import { createPrompt } from "@/prompts/chat/lesson";
import { Logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";

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

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        baseURL: "https://anthropic.helicone.ai/",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-Type": "lesson",
          "Helicone-Property-Subject": data.subject,
        }
      });

      const response = await robustLLMCall(
        () => anthropic.messages.create({
          model: "claude-3-7-sonnet-latest",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
        {
          provider: 'anthropic',
          requestType: 'lesson',
          metadata: {
            subject: data.subject,
            moduleTitle: data.moduleTitle,
          }
        }
      );

      const result = { response: response.content };

      const cleanedResponse = stripResponsePlanning(result.response);
      return { response: cleanedResponse };
    } catch (err) {
      logger.error("Error in chat:", err);
      throw err;
    }
  });
