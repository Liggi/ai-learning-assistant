import { createServerFn } from "@tanstack/start";
import { generateKnowledgeNodesPrompt } from "@/prompts/roadmap/generate-knowledge-nodes";
import { callAnthropic } from "../llm";
import { z } from "zod";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "KnowledgeNodes" });

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
      logger.info(`Generating knowledge nodes for subject: ${data.subject}`);
      const response = await callAnthropic(prompt, knowledgeNodesSchema);

      logger.info(
        `Successfully generated ${response.nodes.length} knowledge nodes`
      );
      return response.nodes;
    } catch (error) {
      logger.error("Error generating knowledge nodes:", error);

      if (error instanceof z.ZodError) {
        const missingFields = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new Error(`Invalid response structure from AI: ${missingFields}`);
      }

      throw new Error(
        `Failed to generate knowledge nodes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
