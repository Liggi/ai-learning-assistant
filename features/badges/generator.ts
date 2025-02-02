import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";
import { Badge } from "./badges";
import { generateBadgesPrompt } from "../../prompts";

interface RoadmapNode {
  id: string;
  data: {
    label: string;
    description: string;
  };
}

interface ModuleBadge extends Badge {
  moduleId: string; // The module where this badge is most likely to be earned
}

export const generateRoadmapBadges = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      nodes: RoadmapNode[];
      selectedKnowledgeNodes: string[];
    }) => {
      return data;
    }
  )
  .handler(async ({ data }) => {
    const maxRetries = 3;
    let attempt = 0;
    let parsedJSON;

    const client = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    const prompt = generateBadgesPrompt({
      subject: data.subject,
      nodes: data.nodes.map(
        (node) => `- (${node.id}) ${node.data.label}: ${node.data.description}`
      ),
      selectedKnowledgeNodes: data.selectedKnowledgeNodes,
    });

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Generating roadmap badges: Attempt ${attempt + 1} of ${maxRetries}`
        );
        attempt++;

        console.log("📤 Sending request to Anthropic API...");
        const message = await client.messages.create({
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "claude-3-sonnet-20240229",
        });

        console.log("📥 Received response from Anthropic API");
        const stringResponse = message.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        console.log("\n🔍 Attempting to parse JSON...");
        console.log("JSON response:", stringResponse);
        parsedJSON = JSON.parse(stringResponse);

        // Validate the structure
        if (!parsedJSON.badges || !Array.isArray(parsedJSON.badges)) {
          throw new Error("Invalid JSON structure: missing badges array");
        }

        // Validate each badge
        parsedJSON.badges = parsedJSON.badges.map((badge: any) => {
          const validModule = data.nodes.some(
            (node) => node.id === badge.moduleId
          );
          if (!validModule) {
            console.error(`Invalid moduleId: ${badge.moduleId}`);
            console.log(
              "Valid module IDs:",
              data.nodes.map((n) => n.id)
            );
          }

          if (
            !badge.name ||
            !badge.description ||
            !badge.level ||
            !badge.moduleId ||
            !["Bronze", "Silver", "Gold", "Platinum"].includes(badge.level) ||
            !validModule
          ) {
            throw new Error("Invalid badge structure or invalid moduleId");
          }
          return badge;
        });

        // Count badges by level
        const badgeCounts = {
          Bronze: 0,
          Silver: 0,
          Gold: 0,
          Platinum: 0,
        };

        parsedJSON.badges.forEach((badge: any) => {
          badgeCounts[badge.level]++;
        });

        console.log("\n📊 Badge level distribution:");
        Object.entries(badgeCounts).forEach(([level, count]) => {
          console.log(`${level}: ${count} badges`);
        });

        console.log("✅ Roadmap badges generated and validated successfully!");
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

    return parsedJSON.badges as ModuleBadge[];
  });

export type { ModuleBadge };
