import { createServerFn } from "@tanstack/start";
import { generateRoadmapPrompt } from "../../prompts";
import { saveRoadmap } from "@/prisma/roadmap";
import { callAnthropic } from "../llm";
import { z } from "zod";

const nodeSchema = z
  .object({
    type: z.string().optional(),
    data: z
      .object({
        status: z.string().optional(),
      })
      .optional(),
  })
  .transform((node) => {
    const data = node.data ?? {};
    if (!data.status) data.status = "not-started";
    return {
      type: node.type ?? "normalNode",
      data,
    };
  });

const edgeSchema = z
  .object({
    type: z.string().optional(),
  })
  .transform((edge) => ({
    type: edge.type ?? "smoothstep",
  }));

const roadmapSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: { subject: string; priorKnowledge: string; subjectId?: string }) =>
      data
  )
  .handler(async ({ data }) => {
    const prompt = generateRoadmapPrompt({
      subject: data.subject,
      priorKnowledge: data.priorKnowledge,
    });

    console.log("📤 Requesting Anthropic API via callAnthropic...");

    const parsedJSON = await callAnthropic(prompt, roadmapSchema);

    if (data.subjectId) {
      console.log(`\n💾 Saving roadmap for subject: ${data.subjectId}`);
      await saveRoadmap({
        data: {
          subjectId: data.subjectId,
          nodes: parsedJSON.nodes,
          edges: parsedJSON.edges,
        },
      });
    }

    console.log("\n🎯 Final parsed result:", parsedJSON);
    return parsedJSON;
  });
