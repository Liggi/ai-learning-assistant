import { createServerFn } from "@tanstack/react-start";
import { generateKnowledgeNodesPrompt } from "@/prompts/roadmap/generate-knowledge-nodes";
import { robustLLMCall } from "@/lib/robust-llm-call";
import { extractJSON } from "@/features/llm-base";
import { z } from "zod";
import { Logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";

const logger = new Logger({ context: "KnowledgeNodes" });

const knowledgeNodesSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string(),
      complexity: z.enum([
        "basic",
        "intermediate",
        "advanced",
        "expert",
        "master",
      ]),
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

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        baseURL: "https://anthropic.helicone.ai/",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-Type": "knowledge-nodes",
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
          requestType: 'knowledge-nodes',
          metadata: {
            subject: data.subject,
          }
        }
      );

      const jsonString = extractJSON(response.content);
      const parsedResponse = JSON.parse(jsonString);
      const validatedResponse = knowledgeNodesSchema.parse(parsedResponse);

      logger.info(
        `Successfully generated ${validatedResponse.nodes.length} knowledge nodes`
      );

      const sortedNodes = [...validatedResponse.nodes].sort((a, b) => {
        const complexityOrder = {
          basic: 1,
          intermediate: 2,
          advanced: 3,
          expert: 4,
          master: 5,
        };

        if (complexityOrder[a.complexity] !== complexityOrder[b.complexity]) {
          return complexityOrder[a.complexity] - complexityOrder[b.complexity];
        }
        return a.name.localeCompare(b.name);
      });

      return sortedNodes;
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
