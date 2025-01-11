import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { Logger } from "@/lib/logger";
import { SerializedSubject } from "@/types/serialized";
import { serializeSubject } from "@/types/serializers";

const logger = new Logger({ context: "SubjectsService", enabled: false });

const createSubjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const createSubject = createServerFn({ method: "POST" })
  .validator((data: unknown) => createSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject> => {
    logger.info("Creating subject", { title: data.title });
    try {
      const subject = await prisma.subject.create({
        data: {
          title: data.title,
          initiallyFamiliarConcepts: [],
        },
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

const updateSubjectSchema = z.object({
  id: z.string().uuid("Invalid subject ID"),
  title: z.string().min(1, "Title is required").optional(),
  initiallyFamiliarConcepts: z.array(z.string()).optional(),
});

export const updateSubject = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject> => {
    const { id, ...updateData } = data;

    logger.info("Updating subject", { id, ...updateData });

    try {
      const updatedSubject = await prisma.subject.update({
        where: { id },
        data: updateData,
      });

      logger.info("Subject updated successfully", { id });
      return serializeSubject(updatedSubject);
    } catch (error) {
      logger.error("Failed to update subject", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        updateData,
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
      const subjects = await prisma.subject.findMany();
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
