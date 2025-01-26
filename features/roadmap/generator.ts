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
   • a "data" object that has:
     - "label" describing the step name
     - "description" providing a brief explanation
     - "status" set to "not-started" (other possible values are "in-progress" and "completed")
3. Ensure that the nodes are spaced with at least 200 units between them vertically, and 300-400 units horizontally. Start the first node at x: 400, y: 0.

4. "edges" should be an array of objects. Each edge should have:
   • "id" in the format "eSOURCEID-TARGETID"
   • a "source" property matching a node's id
   • a "target" property matching a node's id
   • a "type" property set to "smoothstep"

Please ensure your generated roadmap contains expertly crafted learning steps, connecting them logically from basic principles to more advanced ideas. Your output must strictly be valid JSON in the specified shape, with no extra commentary included.
Ensure the roadmap has multiple branching paths, not just one single linear path unless that is the only way to sensibly cover the topics.

For example, follow the structure:
{
  "nodes": [
    {
      "id": "1",
      "position": { "x": 400, "y": 0 },
      "type": "normalNode",
      "data": { 
        "label": "Sample Step",
        "description": "This is a short description of the step",
        "status": "not-started"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "type": "smoothstep"
    }
  ]
}

Make sure the nodes and edges reflect a learning roadmap from fundamentals to more advanced steps.`;

    while (attempt < maxRetries) {
      try {
        console.log(`\n🔄 Attempt ${attempt + 1} of ${maxRetries}`);
        attempt++;

        console.log("📤 Sending request to Anthropic API...");
        const message = await client.messages.create({
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "claude-3-5-sonnet-latest",
        });

        console.log("📥 Received response from Anthropic API");
        const stringResponse = message.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        console.log("\n🔍 Attempting to parse JSON...");
        parsedJSON = JSON.parse(stringResponse);

        // Validate the structure
        if (
          !parsedJSON.nodes ||
          !parsedJSON.edges ||
          !Array.isArray(parsedJSON.nodes) ||
          !Array.isArray(parsedJSON.edges)
        ) {
          throw new Error(
            "Invalid JSON structure: missing nodes or edges arrays"
          );
        }

        // Validate and fix nodes
        parsedJSON.nodes = parsedJSON.nodes.map((node: any) => {
          if (!node.data) node.data = {};
          if (!node.data.status) node.data.status = "not-started";
          if (!node.type) node.type = "normalNode";
          return node;
        });

        // Validate and fix edges
        parsedJSON.edges = parsedJSON.edges.map((edge: any) => {
          if (!edge.type) edge.type = "smoothstep";
          return edge;
        });

        console.log("✅ JSON parsed and validated successfully!");
        break;
      } catch (err) {
        console.error(`\n❌ Attempt ${attempt} failed with error:`, err);
        if (attempt >= maxRetries) {
          console.error("\n💥 All attempts failed after maximum retries");
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\n🎯 Final parsed result:", parsedJSON);
    return parsedJSON;
  });

export const generateKnowledgeNodes = createServerFn({ method: "POST" })
  .validator((data: { subject: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    const client = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    const prompt = `You are a specialized assistant that helps assess a user's knowledge level in ${data.subject}. Generate a comprehensive set of knowledge nodes that represent key concepts, from basic to advanced.

Each node should be a specific, testable piece of knowledge that someone learning about the subject: |${data.subject}| might understand. The nodes should progress from fundamental concepts to more advanced ones

Word the nodes as if the person selecting them is speaking in the first person.'.

Return a JSON object in the following format:

For example:
{ "nodes": [
 { name: "<node name>", depth_level: "<depth level (1-5)>"}
]
}

Generate at least 15-20 nodes representing a breadth of understanding in the subject: |${data.subject}|, ensuring that the nodes are ideally placed to illuminate a learner's current level of understanding and comprehension.

Include at least three nodes that only a person EXTREMELY well versed in the subject would know.`;

    const message = await client.messages.create({
      max_tokens: 4096,
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

    try {
      const parsed = JSON.parse(stringResponse);

      // Validate that we received an object with nodes array
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.nodes)
      ) {
        throw new Error("Expected an object with nodes array from Anthropic");
      }

      // Validate that all items in nodes have the correct structure
      const validatedNodes = parsed.nodes.map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof item.name !== "string" ||
          typeof item.depth_level !== "number" ||
          item.depth_level < 1 ||
          item.depth_level > 5
        ) {
          throw new Error(
            "Each node must have a name (string) and depth_level (number between 1-5)"
          );
        }
        return item;
      });

      return validatedNodes;
    } catch (error) {
      console.error("Error parsing knowledge nodes:", error);
      // Return an empty array as fallback
      return [];
    }
  });
