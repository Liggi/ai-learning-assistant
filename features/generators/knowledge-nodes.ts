import { createServerFn } from "@tanstack/start";
import { generateKnowledgeNodesPrompt } from "../../prompts";
import { callAnthropic } from "../llm";
import { z } from "zod";

const knowledgeNodesSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string(),
      depth_level: z.number().min(1).max(5),
    })
  ),
});

export const generate = createServerFn({ method: "POST" })
  .validator((data: { subject: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    const prompt = generateKnowledgeNodesPrompt({
      subject: data.subject,
    });

    try {
      console.log("📤 Requesting Anthropic API via callAnthropic...");
      const response = await callAnthropic(prompt, knowledgeNodesSchema);
      console.log("✅ Successfully obtained and validated response");
      return response.nodes;
    } catch (error) {
      console.error("Error generating knowledge nodes:", error);
      return []; // @TODO: Throw an error? Not sure of my overall strategy yet.
    }
  });
