import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";
import { Badge } from "./badges";

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

    const prompt = `You are a specialized assistant that creates achievement badges for learning platforms. I need you to generate a set of badges for a learning journey in ${data.subject}.

CRITICAL LEVEL DISTRIBUTION REQUIREMENTS:
- Bronze: 50% of badges (10-13 badges)
- Silver: 25% of badges (5-6 badges) 
- Gold: 20% of badges (4-5 badges)
- Platinum: 5% of badges (EXACTLY 1 badge)
- TOTAL BADGES: 20-25 badges

STRICT ENFORCEMENT:
1. Level distribution MUST match the percentages above
2. Platinum badges MUST be exceptionally rare (only 1)
3. Bronze should be the most common level
4. Gold badges should be reserved for complex integrations or conceptual breakthroughs

Here is the learning roadmap with MODULE IDs in parentheses:
${data.nodes
  .map((node) => `- (${node.id}) ${node.data.label}: ${node.data.description}`)
  .join("\n")}

The learner has indicated they already understand these concepts:
${data.selectedKnowledgeNodes.join("\n")}

Create a set of achievement badges that span this entire learning journey. Each badge must use the EXACT module ID shown in parentheses from the roadmap above. Badges should tell a cohesive story of mastery across the whole curriculum.

Return the badges in this precise JSON format:

{
  "badges": [
    {
      "name": "Badge Name",
      "description": "A description that explains both the achievement and the inside joke/reference",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "moduleId": "EXACT_MODULE_ID_FROM_ROADMAP" // Must match one of the IDs in parentheses above
    }
  ]
}

Guidelines for badge creation:
1. Create 20-25 badges total, distributed across the modules
2. Names should reference common experiences/struggles/revelations in learning this topic
3. Descriptions should acknowledge the shared experience while explaining what was mastered
4. LEVELS MUST FOLLOW THE DISTRIBUTION SHOWN ABOVE - THIS IS CRITICAL
5. Focus on authentic learning moments that practitioners would immediately recognize
6. Make badges build on each other to tell a story of growing mastery
7. Include some badges that require understanding concepts across multiple modules

Example badge (for React Hooks):
{
  "name": "Effect and Cause",
  "description": "Successfully navigated the counterintuitive world of useEffect's cleanup patterns - you've seen both sides of the effect.",
  "level": "Gold",
  "moduleId": "hooks-module" // Must match EXACT module ID from roadmap
}

Return ONLY valid JSON, no additional text or commentary.`;

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
