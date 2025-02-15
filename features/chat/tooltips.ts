import { createServerFn } from "@tanstack/start";
import { Anthropic } from "@anthropic-ai/sdk";

export const generateTooltips = createServerFn({ method: "POST" })
  .validator(
    (data: {
      concepts: string[];
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const client = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    // For each concept, we gather a short tooltip
    const tooltips: Record<string, string> = {};

    // Batch all concepts into a single request for efficiency
    const conceptList = data.concepts.join("\n");
    const prompt = `You are helping explain concepts in the context of ${data.subject}, specifically within the module "${data.moduleTitle}" which covers: ${data.moduleDescription}

Create a short digression / expansion on the relevant concept or entity, 1-2 sentences at most, prefer to be concise. Imagine peeking at an answer to someone saying "tell me about that in the context of this module / subject". Return the response in JSON format like {"tooltips": {"concept1": "definition1", "concept2": "definition2"}}.

All concepts must be covered.

Concepts:
${conceptList}`;

    try {
      const response = await client.messages.create({
        messages: [{ role: "user", content: prompt }],
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      const parsed = JSON.parse(text);
      if (parsed.tooltips) {
        return { tooltips: parsed.tooltips };
      }
    } catch (err) {
      console.error("Error generating tooltips:", err);
    }

    return { tooltips };
  });
