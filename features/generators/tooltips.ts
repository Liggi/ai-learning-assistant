import { createServerFn } from "@tanstack/react-start";
import { callAnthropic } from "../llm";
import { z } from "zod";
import { createTooltipPrompt } from "@/prompts/chat/tooltips";

const tooltipResponseSchema = z.object({
  tooltips: z.record(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator((data: { concepts: string[]; subject: string }) => data)
  .handler(async ({ data }) => {
    try {
      const prompt = createTooltipPrompt(data);

      const result = await callAnthropic(prompt, tooltipResponseSchema);

      return result;
    } catch (error) {
      console.error("Error generating tooltips:", error);
      // Return empty tooltips object when there's an error
      return { tooltips: {} };
    }
  });
