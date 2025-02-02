import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";
import {
  generateRoadmapPrompt,
  generateKnowledgeNodesPrompt,
} from "../../prompts";

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

    const prompt = generateRoadmapPrompt({
      subject: data.subject,
      priorKnowledge: data.priorKnowledge,
    });

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

    const prompt = generateKnowledgeNodesPrompt({
      subject: data.subject,
    });

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
