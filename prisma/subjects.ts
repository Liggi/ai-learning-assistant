import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { SubjectSchema, CurriculumMapSchema } from "./generated/zod";
import { SerializedCurriculumMapSchema } from "./curriculum-maps";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "SubjectsService" });

type PrismaSubject = z.infer<typeof SubjectSchema>;
type PrismaCurriculumMap = z.infer<typeof CurriculumMapSchema>;

export const SerializedSubjectSchema = SubjectSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  curriculumMap: SerializedCurriculumMapSchema.nullable().optional(),
});

export type SerializedSubject = z.infer<typeof SerializedSubjectSchema>;

export function serializeSubject(
  subject: PrismaSubject & { curriculumMap?: PrismaCurriculumMap | null }
): SerializedSubject {
  return SerializedSubjectSchema.parse({
    ...subject,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
    curriculumMap: subject.curriculumMap
      ? {
          ...subject.curriculumMap,
          createdAt: subject.curriculumMap.createdAt.toISOString(),
          updatedAt: subject.curriculumMap.updatedAt.toISOString(),
          nodes: subject.curriculumMap.nodes,
          edges: subject.curriculumMap.edges,
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
        include: { curriculumMap: true },
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
        include: { curriculumMap: true },
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

export const getSubject = createServerFn({ method: "GET" })
  .validator((data: unknown) => getSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject | null> => {
    logger.info("Fetching subject", { id: data.id });
    try {
      const subject = await prisma.subject.findUnique({
        where: { id: data.id },
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

export const getSubjectWithCurriculumMap = createServerFn({ method: "GET" })
  .validator((data: unknown) => getSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject | null> => {
    logger.info("Fetching subject with curriculum map", { id: data.id });
    try {
      const subject = await prisma.subject.findUnique({
        where: { id: data.id },
        include: { curriculumMap: true },
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

export const getSubjectCurriculumMapId = createServerFn({ method: "GET" })
  .validator((data: { subjectId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting curriculum map ID for subject", {
      subjectId: data.subjectId,
    });
    try {
      const subject = await prisma.subject.findUnique({
        where: { id: data.subjectId },
        include: { curriculumMap: true },
      });

      if (!subject || !subject.curriculumMap) {
        throw new Error(
          `Subject not found or has no curriculum map: ${data.subjectId}`
        );
      }

      return { curriculumMapId: subject.curriculumMap.id };
    } catch (error) {
      logger.error("Error getting curriculum map ID for subject", { error });
      throw error;
    }
  });
