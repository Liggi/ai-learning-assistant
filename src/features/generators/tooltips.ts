import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { extractJSON } from "@/features/llm-base";
import { Logger } from "@/lib/logger";
import { robustLLMCall } from "@/lib/robust-llm-call";

const logger = new Logger({ context: "TooltipsGenerator", enabled: false });

const _tooltipResponseSchema = z.object({
  tooltips: z.record(z.string()),
});

const singleTooltipResponseSchema = z.object({
  tooltip: z.string(),
});

export const generate = createServerFn({ method: "POST" })
  .validator((data: { concepts: string[]; subject: string; articleContent: string }) => data)
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }

      const anthropic = new Anthropic({
        apiKey,
        baseURL: "https://anthropic.helicone.ai/",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-Type": "tooltip",
          "Helicone-Property-Subject": data.subject,
        },
      });

      // Generate tooltips in parallel, one per concept
      const tooltipPromises = data.concepts.map(async (concept, index) => {
        const prompt = createSingleTooltipPrompt(concept, data.subject, data.articleContent);

        try {
          const response = await robustLLMCall(
            () =>
              anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }],
              }),
            {
              provider: "anthropic",
              requestType: "tooltip",
              metadata: {
                subject: data.subject,
                concept,
                conceptIndex: index,
                totalConcepts: data.concepts.length,
                articleContentLength: data.articleContent.length,
              },
            }
          );

          const jsonString = extractJSON(response.content);
          const parsedResponse = JSON.parse(jsonString);
          const validatedResponse = singleTooltipResponseSchema.parse(parsedResponse);

          return { concept, tooltip: validatedResponse.tooltip };
        } catch (error) {
          logger.warn(`Failed to generate tooltip for concept "${concept}"`, {
            subject: data.subject,
            concept,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return { concept, tooltip: null };
        }
      });

      // Wait for all tooltips to complete
      const results = await Promise.allSettled(tooltipPromises);

      // Collect successful tooltips
      const tooltips: Record<string, string> = {};
      let successCount = 0;

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.tooltip) {
          tooltips[result.value.concept.toLowerCase()] = result.value.tooltip;
          successCount++;
        }
      });

      logger.info("Tooltip generation completed", {
        subject: data.subject,
        requestedCount: data.concepts.length,
        successCount,
        failureCount: data.concepts.length - successCount,
      });

      return { tooltips };
    } catch (error) {
      logger.error("Error generating tooltips:", error);
      return { tooltips: {} };
    }
  });

function createSingleTooltipPrompt(
  concept: string,
  subject: string,
  articleContent: string
): string {
  return `You are helping explain a concept in the context of learning about ${subject}.

Here is the full article content for context:

${articleContent}

Create a concise, standalone explanation for the concept "${concept}". Use the article content to understand the specific context and level of detail needed, but write the explanation as a self-contained definition that doesn't explicitly reference the article. The tooltip should:

1. Start with an ### h3 header that serves as a title for the concept (this can be different from the concept name)
2. Provide a clear, concise explanation of the concept appropriate for someone learning about ${subject}
3. Include why it's important or how it's commonly used in this domain
4. Match the complexity level and perspective presented in the provided context

Format requirements:
- Begin with an ### h3 header as a title
- Keep explanation to one or two short paragraphs
- Use **bold** for important terms or phrases
- Keep the total length concise but informative
- Write as a standalone explanation (don't say "this article explains" or "as mentioned above")

IMPORTANT: Your response MUST be a valid JSON object with the following structure:
{
  "tooltip": "### Concept Title\\n\\nMarkdown formatted explanation..."
}

Do not include any text outside of this JSON structure. The response should be parseable by JSON.parse() without any modifications.`;
}
