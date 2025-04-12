import { createServerFn } from "@tanstack/react-start";
import { AnthropicProvider } from "../anthropic";
import { z } from "zod";
import { createTooltipPrompt } from "@/prompts/chat/tooltips";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "TooltipsGenerator" });

const tooltipResponseSchema = z.object({
  tooltips: z.record(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator((data: { concepts: string[]; subject: string }) => data)
  .handler(async ({ data }) => {
    try {
      const prompt = createTooltipPrompt(data);

      const anthropicProvider = new AnthropicProvider();
      const result = await anthropicProvider.generateResponse(
        prompt,
        tooltipResponseSchema,
        `tooltips_${data.subject}`
      );

      return result;
    } catch (error) {
      logger.error("Error generating tooltips:", error);
      // Return empty tooltips object when there's an error
      return { tooltips: {} };
    }
  });
