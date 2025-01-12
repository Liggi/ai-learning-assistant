import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";

export const generateRoadmap = createServerFn({ method: "POST" })
  .validator((data: { subject: string; priorKnowledge: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    const maxRetries = 3;
    let attempt = 0;
    let parsedJSON;

    const client = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    const prompt = `You are a specialized assistant that can create structured data in JSON. I want you to generate a list of thoughtful learning steps in the form of an array of "nodes," and an array of "edges" connecting them. 

The user wants to learn about ${data.subject} and has provided their current understanding:
"""
${data.priorKnowledge}
"""

Using the Feynman Technique principles, analyze their explanation to identify knowledge gaps and misconceptions. Then create a personalized learning roadmap that:
1. Builds upon their existing knowledge
2. Addresses any gaps or misconceptions identified
3. Introduces new concepts in a logical progression
4. Includes practical exercises and examples

Please precisely follow this format:

1. Return a JSON object with two keys: "nodes" and "edges".  
2. "nodes" should be an array of objects. Each node should have:
   • an "id" as a string,  
   • a "position" property with x and y coordinates (e.g. { x: 200, y: 400 }),  
   • a "type" property set to "normalNode",  
   • a "data" object that has a "label" describing the step name.  
3. Ensure that the nodes are spaced with at least 200 units between them vertically, and 200 units horizontally (300-400 if a title on that row is long), and if there are nodes with longer names that you've accounted for horizontal spacing. Do not worry about running out of space on the screen, it will be handled.

4. "edges" should be an array of objects. Each edge should have an:
   • "id" in the format "eSOURCEID-TARGETID"  
   • a "source" property matching a node's id  
   • a "target" property matching a node's id  

Please ensure your generated roadmap contains expertly crafted learning steps, connecting them logically from basic principles to more advanced ideas. Your output must strictly be valid JSON in the specified shape, with no extra commentary included.
Ensure the roadmap has multiple branching paths, not just one single linear path unless that is the only way to sensibly cover the topics.

For example, follow the structure:
{
  "nodes": [
    {
      "id": "1",
      "position": { "x": 400, "y": 0 },
      "type": "normalNode",
      "data": { "label": "Sample Step", "description": "This is a short description of the same step and the subject matter therein" }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2"
    }
  ]
}

Make sure the nodes and edges reflect a learning roadmap from fundamentals to more advanced steps.`;

    while (attempt < maxRetries) {
      try {
        attempt++;

        const message = await client.messages.create({
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "claude-3-5-sonnet-latest",
        });

        const stringResponse = message.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        parsedJSON = JSON.parse(stringResponse);

        // If parsing is successful, break out of the loop
        break;
      } catch (err) {
        console.error(`Attempt ${attempt} failed:`, err);

        if (attempt >= maxRetries) {
          console.error("Error in generateRoadmap after maximum retries:", err);
          throw err;
        }

        // Optionally, wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return parsedJSON;
  });
