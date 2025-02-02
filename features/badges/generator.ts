import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";
import { Badge } from "./badges";

export const generateBadges = createServerFn({ method: "POST" })
  .validator((data: { moduleTitle: string; moduleDescription: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    const maxRetries = 3;
    let attempt = 0;
    let parsedJSON;

    const client = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    const prompt = `You are a specialized assistant that creates achievement badges for learning platforms. I need you to generate a set of badges for the module: "${data.moduleTitle}" (${data.moduleDescription}).

Each badge should be an inside joke or reference that would resonate deeply with practitioners in this field - not just puns, but references that capture key moments of understanding or common experiences in learning this specific topic.

The badges should track genuine mastery of concepts, but their names should turn shared learning experiences into cultural touchstones - marking not just "you learned this" but "you went through what we all went through to truly understand this."

Return exactly 5-7 badges in this precise JSON format:

{
  "badges": [
    {
      "name": "Badge Name",
      "description": "A description that explains both the achievement and the inside joke/reference",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum"
    }
  ]
}

Guidelines for badge creation:
1. Names should be clever references to common experiences/struggles/revelations in learning this topic
2. Descriptions should acknowledge the shared experience while explaining what was mastered
3. Levels should reflect the complexity of the concept (Bronze for fundamentals, Platinum for advanced mastery)
4. Focus on authentic learning moments that practitioners would immediately recognize
5. Avoid generic puns; aim for specific references to the learning journey

Example badge (for React Hooks):
{
  "name": "Effect and Cause",
  "description": "Successfully navigated the counterintuitive world of useEffect's cleanup patterns - you've seen both sides of the effect.",
  "level": "Gold"
}

Return ONLY valid JSON, no additional text or commentary.`;

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Generating badges: Attempt ${attempt + 1} of ${maxRetries}`
        );
        attempt++;

        console.log("📤 Sending request to Anthropic API...");
        const message = await client.messages.create({
          max_tokens: 1024,
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
        parsedJSON = JSON.parse(stringResponse);

        // Validate the structure
        if (!parsedJSON.badges || !Array.isArray(parsedJSON.badges)) {
          throw new Error("Invalid JSON structure: missing badges array");
        }

        // Validate each badge
        parsedJSON.badges = parsedJSON.badges.map((badge: any) => {
          if (
            !badge.name ||
            !badge.description ||
            !badge.level ||
            !["Bronze", "Silver", "Gold", "Platinum"].includes(badge.level)
          ) {
            throw new Error("Invalid badge structure");
          }
          return badge;
        });

        console.log("✅ Badges generated and validated successfully!");
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

    return parsedJSON.badges as Badge[];
  });
