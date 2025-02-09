import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";
import {
  CurriculumAchievementBadge,
  ModuleAchievementBadge,
} from "../../types/badges";

interface RoadmapNode {
  id: string;
  data: {
    label: string;
    description: string;
  };
}

// Generate achievement badges for the entire curriculum
export const generateCurriculumAchievements = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      subjectArea: string;
      nodes: RoadmapNode[];
      completedModules: string[];
      overallProgress: number;
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

    const prompt = `You are a specialized assistant that creates achievement badges for learning platforms. Create a set of curriculum-wide achievement badges for a student's progress in ${data.subject} (${data.subjectArea}).

Current Progress:
- Completed Modules: ${data.completedModules.length} out of ${data.nodes.length}
- Overall Progress: ${Math.round(data.overallProgress * 100)}%

Curriculum Overview:
${data.nodes.map((node) => `- ${node.data.label}: ${node.data.description}`).join("\n")}

CRITICAL LEVEL DISTRIBUTION:
- Bronze: 50% (5-6 badges)
- Silver: 25% (2-3 badges)
- Gold: 20% (2 badges)
- Platinum: 5% (EXACTLY 1 badge)
TOTAL: 10-12 curriculum-wide badges

Create badges that:
1. Recognize achievements that span multiple modules
2. Celebrate major learning milestones
3. Include clever references to ${data.subject} concepts
4. Build up to the Platinum badge as a major achievement

Return in this JSON format:
{
  "achievementBadges": [
    {
      "name": "string",
      "description": "string",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "requirements": ["string"],
      "subjectArea": "${data.subjectArea}"
    }
  ]
}`;

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Generating curriculum achievements: Attempt ${attempt + 1} of ${maxRetries}`
        );
        attempt++;

        const message = await client.messages.create({
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
          model: "claude-3-sonnet-20240229",
        });

        const stringResponse = message.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        parsedJSON = JSON.parse(stringResponse);

        // Validate the structure
        if (
          !parsedJSON.achievementBadges ||
          !Array.isArray(parsedJSON.achievementBadges)
        ) {
          throw new Error(
            "Invalid JSON structure: missing achievementBadges array"
          );
        }

        // Validate each badge
        parsedJSON.achievementBadges = parsedJSON.achievementBadges.map(
          (badge: any) => {
            if (
              !badge.name ||
              !badge.description ||
              !badge.level ||
              !Array.isArray(badge.requirements) ||
              !badge.subjectArea ||
              badge.subjectArea !== data.subjectArea ||
              !["Bronze", "Silver", "Gold", "Platinum"].includes(badge.level)
            ) {
              throw new Error("Invalid badge structure");
            }
            return badge;
          }
        );

        // Count badges by level
        const badgeCounts = {
          Bronze: 0,
          Silver: 0,
          Gold: 0,
          Platinum: 0,
        };

        parsedJSON.achievementBadges.forEach((badge: any) => {
          badgeCounts[badge.level]++;
        });

        // Validate distribution
        if (badgeCounts.Platinum !== 1) {
          throw new Error("Must have exactly 1 Platinum badge");
        }

        console.log("\n📊 Badge level distribution:");
        Object.entries(badgeCounts).forEach(([level, count]) => {
          console.log(`${level}: ${count} badges`);
        });

        console.log("✅ Curriculum achievements generated successfully!");
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

    return parsedJSON.achievementBadges as CurriculumAchievementBadge[];
  });

// Generate achievement badges for a specific module
export const generateModuleAchievements = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      moduleId: string;
      moduleLabel: string;
      moduleDescription: string;
      concepts: string[];
      progress: number;
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

    const prompt = `You are a specialized assistant that creates achievement badges for learning platforms. Create a set of module-specific achievement badges for progress in the ${data.moduleLabel} module of ${data.subject}.

Module Description: ${data.moduleDescription}
Key Concepts: ${data.concepts.join(", ")}
Current Progress: ${Math.round(data.progress * 100)}%

CRITICAL LEVEL DISTRIBUTION:
- Bronze: 50% (4-5 badges)
- Silver: 25% (2-3 badges)
- Gold: 20% (1-2 badges)
- Platinum: 5% (EXACTLY 1 badge)
TOTAL: 8-11 module-specific badges

Create badges that:
1. Recognize mastery of specific module concepts
2. Celebrate key learning milestones
3. Include clever references to module-specific concepts
4. Build up to the Platinum badge as major module achievement

Return in this JSON format:
{
  "achievementBadges": [
    {
      "name": "string",
      "description": "string",
      "level": "Bronze" | "Silver" | "Gold" | "Platinum",
      "requirements": ["string"],
      "moduleId": "${data.moduleId}"
    }
  ]
}`;

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Generating module achievements: Attempt ${attempt + 1} of ${maxRetries}`
        );
        attempt++;

        const message = await client.messages.create({
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
          model: "claude-3-sonnet-20240229",
        });

        const stringResponse = message.content
          .filter((block): block is TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        parsedJSON = JSON.parse(stringResponse);

        // Validate the structure
        if (
          !parsedJSON.achievementBadges ||
          !Array.isArray(parsedJSON.achievementBadges)
        ) {
          throw new Error(
            "Invalid JSON structure: missing achievementBadges array"
          );
        }

        // Validate each badge
        parsedJSON.achievementBadges = parsedJSON.achievementBadges.map(
          (badge: any) => {
            if (
              !badge.name ||
              !badge.description ||
              !badge.level ||
              !Array.isArray(badge.requirements) ||
              !badge.moduleId ||
              badge.moduleId !== data.moduleId ||
              !["Bronze", "Silver", "Gold", "Platinum"].includes(badge.level)
            ) {
              throw new Error("Invalid badge structure");
            }
            return badge;
          }
        );

        // Count badges by level
        const badgeCounts = {
          Bronze: 0,
          Silver: 0,
          Gold: 0,
          Platinum: 0,
        };

        parsedJSON.achievementBadges.forEach((badge: any) => {
          badgeCounts[badge.level]++;
        });

        // Validate distribution
        if (badgeCounts.Platinum !== 1) {
          throw new Error("Must have exactly 1 Platinum badge");
        }

        console.log("\n📊 Badge level distribution:");
        Object.entries(badgeCounts).forEach(([level, count]) => {
          console.log(`${level}: ${count} badges`);
        });

        console.log("✅ Module achievements generated successfully!");
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

    return parsedJSON.achievementBadges as ModuleAchievementBadge[];
  });
