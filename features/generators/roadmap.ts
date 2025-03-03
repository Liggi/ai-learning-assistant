import { createServerFn } from "@tanstack/start";
import { generateRoadmapPrompt } from "@/prompts/roadmap/generate-roadmap";
import { saveRoadmap } from "@/prisma/roadmap";
import { callAnthropic } from "../llm";
import { z } from "zod";
import {
  roadmapNodeSchema,
  roadmapEdgeSchema,
  roadmapNodeDataSchema,
  RoadmapNode,
  RoadmapEdge,
} from "@/types/roadmap";
import { Logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

const logger = new Logger({ context: "RoadmapGenerator" });

const nodeDataSchema = z.object({
  label: z.string().default("Untitled"),
  description: z.string().default("No description provided"),
  status: z
    .enum(["not-started", "in-progress", "completed"])
    .default("not-started"),
});

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const nodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("normalNode").default("normalNode"),
    position: positionSchema,
    data: nodeDataSchema,
  })
  .transform(
    (node): RoadmapNode => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })
  );

const edgeSchema = z
  .object({
    id: z.string(),
    type: z.literal("smoothstep").default("smoothstep"),
    source: z.string(),
    target: z.string(),
  })
  .transform(
    (edge): RoadmapEdge => ({
      id: edge.id,
      type: edge.type,
      source: edge.source,
      target: edge.target,
    })
  );

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
    logger.info("Starting roadmap generation process", {
      subject: data.subject,
      hasSubjectId: !!data.subjectId,
      priorKnowledgeLength: data.priorKnowledge.length,
    });

    try {
      const prompt = generateRoadmapPrompt({
        subject: data.subject,
        priorKnowledge: data.priorKnowledge,
      });

      logger.info("Requesting Anthropic API");
      const parsedJSON = await callAnthropic(prompt, roadmapSchema);
      logger.info("Successfully received and parsed Anthropic response");

      logger.debug("Validating roadmap structure");
      if (!parsedJSON.nodes.length) {
        throw new Error("Generated roadmap contains no nodes");
      }
      if (!parsedJSON.edges.length) {
        throw new Error("Generated roadmap contains no edges");
      }

      const nodeIds = parsedJSON.nodes.map((node) => node.id);

      const processedEdges = parsedJSON.edges.map((edge, index) => {
        const sourceIndex = Math.floor(index / 2);
        const targetIndex = sourceIndex + 1;

        if (sourceIndex >= nodeIds.length || targetIndex >= nodeIds.length) {
          logger.warn("Edge references non-existent nodes", {
            edge,
            sourceIndex,
            targetIndex,
          });
          return edge;
        }

        return {
          ...edge,
          source: nodeIds[sourceIndex],
          target: nodeIds[targetIndex],
        };
      });

      const finalRoadmap = {
        nodes: parsedJSON.nodes,
        edges: processedEdges,
      };

      logger.debug("Roadmap structure validation passed", {
        nodesCount: finalRoadmap.nodes.length,
        edgesCount: finalRoadmap.edges.length,
      });

      if (data.subjectId) {
        logger.info("Saving roadmap", { subjectId: data.subjectId });
        try {
          await saveRoadmap({
            data: {
              subjectId: data.subjectId,
              nodes: finalRoadmap.nodes,
              edges: finalRoadmap.edges,
            },
          });
          logger.info("Roadmap saved successfully", {
            subjectId: data.subjectId,
          });
        } catch (saveError) {
          logger.error("Error saving roadmap", {
            error:
              saveError instanceof Error ? saveError.message : "Unknown error",
            subjectId: data.subjectId,
          });
          throw new Error(
            `Failed to save roadmap: ${
              saveError instanceof Error ? saveError.message : "Unknown error"
            }`
          );
        }
      }

      return finalRoadmap;
    } catch (error) {
      logger.error("Error in roadmap generation", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        subject: data.subject,
        subjectId: data.subjectId,
      });
      throw error;
    }
  });
