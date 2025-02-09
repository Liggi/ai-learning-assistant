import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { createServerFn } from "@tanstack/start";
import {
  CurriculumLearningPathBadge,
  ModuleLearningPathBadge,
} from "../../types/badges";

interface RoadmapNode {
  id: string;
  data: {
    label: string;
    description: string;
  };
}

// Generate learning path badges for the entire curriculum
export const generateCurriculumLearningPath = createServerFn({ method: "POST" })
  .validator(
    (data: { subject: string; subjectArea: string; nodes: RoadmapNode[] }) => {
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

    const prompt = `You are a specialized AI focused on creating learning pathways. Given a curriculum in ${data.subject} (${data.subjectArea}), create a sequence of high-level learning badges that will guide a student through mastering the entire subject area.

Curriculum Overview:
${data.nodes.map((node) => `- ${node.data.label}: ${node.data.description}`).join("\n")}

For each major concept that spans multiple modules, create a learning badge that includes:
1. A clear concept identifier
2. 2-3 probing questions that verify understanding
3. Prerequisites (other concepts that should be understood first)
4. Specific criteria to verify mastery

The badges should:
- Focus on high-level concepts that span multiple modules
- Build on each other logically
- Cover foundational to advanced concepts
- Include questions that probe both understanding and application

Return the badges in this JSON format:
{
  "learningPathBadges": [
    {
      "id": "string (subject-area-concept)",
      "concept": "string",
      "suggestedQuestions": ["string"],
      "prerequisites": ["string"],
      "verificationCriteria": "string",
      "subjectArea": "${data.subjectArea}"
    }
  ]
}`;

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Generating curriculum learning path: Attempt ${attempt + 1} of ${maxRetries}`
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
          !parsedJSON.learningPathBadges ||
          !Array.isArray(parsedJSON.learningPathBadges)
        ) {
          throw new Error(
            "Invalid JSON structure: missing learningPathBadges array"
          );
        }

        // Validate each badge
        parsedJSON.learningPathBadges = parsedJSON.learningPathBadges.map(
          (badge: any) => {
            if (
              !badge.id ||
              !badge.concept ||
              !Array.isArray(badge.suggestedQuestions) ||
              !Array.isArray(badge.prerequisites) ||
              !badge.verificationCriteria ||
              !badge.subjectArea ||
              badge.subjectArea !== data.subjectArea
            ) {
              throw new Error("Invalid badge structure");
            }
            return badge;
          }
        );

        console.log("✅ Curriculum learning path generated successfully!");
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

    return parsedJSON.learningPathBadges as CurriculumLearningPathBadge[];
  });

// Generate learning path badges for a specific module
export const generateModuleLearningPath = createServerFn({ method: "POST" })
  .validator(
    (data: {
      moduleId: string;
      moduleLabel: string;
      moduleDescription: string;
      concepts: string[];
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

    const prompt = `You are a specialized AI focused on creating learning pathways. Given a module in ${data.moduleLabel}, create a sequence of learning badges that will guide a student through mastering the content.

Module Description: ${data.moduleDescription}
Key Concepts: ${data.concepts.join(", ")}

For each concept, create a learning badge that includes:
1. A clear concept identifier
2. 2-3 probing questions that verify understanding
3. Prerequisites (other concepts that should be understood first)
4. Specific criteria to verify mastery

The badges should:
- Build on each other logically
- Cover all key concepts
- Include questions that probe both understanding and application
- Have clear, measurable verification criteria

Return the badges in this JSON format:
{
  "learningPathBadges": [
    {
      "id": "string (module-id-concept)",
      "concept": "string",
      "suggestedQuestions": ["string"],
      "prerequisites": ["string"],
      "verificationCriteria": "string",
      "moduleId": "${data.moduleId}"
    }
  ]
}`;

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Generating module learning path: Attempt ${attempt + 1} of ${maxRetries}`
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
          !parsedJSON.learningPathBadges ||
          !Array.isArray(parsedJSON.learningPathBadges)
        ) {
          throw new Error(
            "Invalid JSON structure: missing learningPathBadges array"
          );
        }

        // Validate each badge
        parsedJSON.learningPathBadges = parsedJSON.learningPathBadges.map(
          (badge: any) => {
            if (
              !badge.id ||
              !badge.concept ||
              !Array.isArray(badge.suggestedQuestions) ||
              !Array.isArray(badge.prerequisites) ||
              !badge.verificationCriteria ||
              !badge.moduleId ||
              badge.moduleId !== data.moduleId
            ) {
              throw new Error("Invalid badge structure");
            }
            return badge;
          }
        );

        console.log("✅ Module learning path generated successfully!");
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

    return parsedJSON.learningPathBadges as ModuleLearningPathBadge[];
  });
