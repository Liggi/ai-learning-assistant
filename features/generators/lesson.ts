import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { callAnthropic } from "@/features/llm";
import { systemPrompt } from "@/prompts";

const stripResponsePlanning = (text: string): string => {
  return text
    .replace(/<response_planning>[\s\S]*?<\/response_planning>/g, "")
    .trim();
};

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
      const generateResponseSchema = z.object({
        response: z.string(),
      });

      const prompt = `${systemPrompt({
        subject: data.subject,
        moduleTitle: data.moduleTitle,
        moduleDescription: data.moduleDescription,
      })}

${data.message}

Please answer and return only valid JSON using this format:
{"response": "your answer"}`;

      const result = await callAnthropic(prompt, generateResponseSchema);

      const cleanedResponse = stripResponsePlanning(result.response);
      return { response: cleanedResponse };
    } catch (err) {
      console.error("Error in chat:", err);
      throw err;
    }
  });
