import { createServerFn } from "@tanstack/start";
import { generateRoadmapPrompt } from "@/prompts/roadmap/generate-roadmap";
import { saveCurriculumMap } from "@/prisma/curriculum-maps";
import { callAnthropic } from "../llm";
import { z } from "zod";
import {
  curriculumMapNodeSchema,
  curriculumMapEdgeSchema,
  curriculumMapNodeDataSchema,
  CurriculumMapNode,
  CurriculumMapEdge,
} from "@/types/curriculum-map";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "CurriculumMapGenerator" });

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
    (node): CurriculumMapNode => ({
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
    (edge): CurriculumMapEdge => ({
      id: edge.id,
      type: edge.type,
      source: edge.source,
      target: edge.target,
    })
  );

const curriculumMapSchema = z.object({
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: { subject: string; priorKnowledge: string; subjectId?: string }) =>
      data
  )
  .handler(async ({ data }) => {
    logger.info("Starting curriculum map generation process", {
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
      const parsedJSON = await callAnthropic(prompt, curriculumMapSchema);
      logger.info("Successfully received and parsed Anthropic response");

      logger.debug("Validating curriculum map structure");
      if (!parsedJSON.nodes.length) {
        throw new Error("Generated curriculum map contains no nodes");
      }
      if (!parsedJSON.edges.length) {
        throw new Error("Generated curriculum map contains no edges");
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

      const finalCurriculumMap = {
        nodes: parsedJSON.nodes,
        edges: processedEdges,
      };

      logger.debug("Curriculum map structure validation passed", {
        nodesCount: finalCurriculumMap.nodes.length,
        edgesCount: finalCurriculumMap.edges.length,
      });

      if (data.subjectId) {
        logger.info("Saving curriculum map", { subjectId: data.subjectId });
        try {
          await saveCurriculumMap({
            data: {
              subjectId: data.subjectId,
              nodes: finalCurriculumMap.nodes,
              edges: finalCurriculumMap.edges,
            },
          });
          logger.info("Curriculum map saved successfully", {
            subjectId: data.subjectId,
          });
        } catch (saveError) {
          logger.error("Error saving curriculum map", {
            error:
              saveError instanceof Error ? saveError.message : "Unknown error",
            subjectId: data.subjectId,
          });
          throw new Error(
            `Failed to save curriculum map: ${
              saveError instanceof Error ? saveError.message : "Unknown error"
            }`
          );
        }
      }

      return finalCurriculumMap;
    } catch (error) {
      logger.error("Error in curriculum map generation", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        subject: data.subject,
        subjectId: data.subjectId,
      });
      throw error;
    }
  });
