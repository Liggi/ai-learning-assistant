import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createTooltipPrompt } from "@/prompts/chat/tooltips";
import { robustLLMCall } from "@/lib/robust-llm-call";
import { extractJSON } from "@/features/llm-base";
import { Logger } from "@/lib/logger";
import OpenAI from "openai";

const logger = new Logger({ context: "TooltipsGenerator" });

const tooltipResponseSchema = z.object({
  tooltips: z.record(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator((data: { concepts: string[]; subject: string }) => data)
  .handler(async ({ data }) => {
    try {
      const prompt = createTooltipPrompt(data);
      const requestId = `tooltips_${data.subject}`;

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        baseURL: "https://oai.helicone.ai/v1",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-Type": "tooltip",
          "Helicone-Property-Subject": data.subject,
        }
      });

      const response = await robustLLMCall(
        () => openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }),
        {
          provider: 'openai',
          requestType: 'tooltip',
          metadata: {
            subject: data.subject,
            conceptCount: data.concepts.length,
          }
        }
      );

      const jsonString = extractJSON(response.content);
      const parsedResponse = JSON.parse(jsonString);
      const validatedResponse = tooltipResponseSchema.parse(parsedResponse);

      return validatedResponse;
    } catch (error) {
      logger.error("Error generating tooltips:", error);
      return { tooltips: {} };
    }
  });
