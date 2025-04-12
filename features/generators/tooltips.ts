import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createTooltipPrompt } from "@/prompts/chat/tooltips";
import { Logger } from "@/lib/logger";
import { callLLM } from "../llm-base";

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

      const result = await callLLM(
        "openai",
        prompt,
        tooltipResponseSchema,
        requestId,
        { model: "gpt-4o" }
      );

      return result;
    } catch (error) {
      logger.error("Error generating tooltips:", error);
      // Return empty tooltips object when there's an error
      return { tooltips: {} };
    }
  });
