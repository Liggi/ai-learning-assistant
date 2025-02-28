import { z } from "zod";
import prisma from "@/prisma/client";
import type { Subject, Roadmap } from "@prisma/client";
import { createServerFn } from "@tanstack/start";
import { SubjectSchema } from "./generated/zod";
import { SerializedRoadmapSchema } from "./roadmap";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "SubjectsService" });

export const SerializedSubjectSchema = SubjectSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  roadmap: SerializedRoadmapSchema.nullable().optional(),
});

export type SerializedSubject = z.infer<typeof SerializedSubjectSchema>;

export function serializeSubject(
  subject: Subject & { roadmap?: Roadmap | null }
): SerializedSubject {
  return SerializedSubjectSchema.parse({
    ...subject,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
    roadmap: subject.roadmap
      ? {
          ...subject.roadmap,
          createdAt: subject.roadmap.createdAt.toISOString(),
          updatedAt: subject.roadmap.updatedAt.toISOString(),
          nodes: subject.roadmap.nodes,
          edges: subject.roadmap.edges,
        }
      : null,
  });
}

const createSubjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const createSubject = createServerFn({ method: "POST" })
  .validator((data: unknown) => createSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject> => {
    logger.info("Creating subject", { title: data.title });
    try {
      const subject = await prisma.subject.create({
        data: { title: data.title },
        include: { roadmap: true },
      });
      logger.info("Subject created successfully", { id: subject.id });
      return serializeSubject(subject);
    } catch (error) {
      logger.error("Failed to create subject", {
        error: error instanceof Error ? error.message : "Unknown error",
        title: data.title,
      });
      throw error;
    }
  });

export const getAllSubjects = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    if (data && typeof data === "object" && "$undefined" in data) {
      return {};
    }
    return data;
  })
  .handler(async () => {
    logger.info("Fetching all subjects");
    try {
      const subjects = await prisma.subject.findMany({
        include: { roadmap: true },
      });
      logger.info("Subjects fetched successfully", { count: subjects.length });
      return subjects.map(serializeSubject);
    } catch (error) {
      logger.error("Failed to fetch subjects", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

const getSubjectSchema = z.object({
  id: z.string().uuid("Invalid subject ID"),
});

export const getSubjectWithRoadmap = createServerFn({ method: "GET" })
  .validator((data: unknown) => getSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject | null> => {
    logger.info("Fetching subject with roadmap", { id: data.id });
    try {
      const subject = await prisma.subject.findUnique({
        where: { id: data.id },
        include: { roadmap: true },
      });

      if (!subject) {
        logger.warn("Subject not found", { id: data.id });
        return null;
      }

      logger.info("Subject fetched successfully", { id: data.id });
      return serializeSubject(subject);
    } catch (error) {
      logger.error("Failed to fetch subject", {
        error: error instanceof Error ? error.message : "Unknown error",
        id: data.id,
      });
      throw error;
    }
  });
