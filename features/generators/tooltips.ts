import { createServerFn } from "@tanstack/start";
import { callAnthropic } from "../llm"; // using the reusable Anthropic caller
import { z } from "zod";
import { createTooltipPrompt } from "@/prompts/chat/tooltips";

const tooltipResponseSchema = z.object({
  tooltips: z.record(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: {
      concepts: string[];
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
    }) => data
  )
  .handler(async ({ data }) => {
    try {
      const prompt = createTooltipPrompt(data);
      return await callAnthropic(prompt, tooltipResponseSchema);
    } catch (err) {
      console.error("Error generating tooltips:", err);
      return { tooltips: {} };
    }
  });
