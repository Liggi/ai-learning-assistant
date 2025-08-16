import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { auth } from "@/lib/auth.server";
import { Logger } from "@/lib/logger";
import prisma from "@/prisma/client";
import type { SerializedSubject } from "@/types/serialized";
import { serializeSubject } from "@/types/serializers";

const logger = new Logger({ context: "SubjectsService", enabled: false });

const createSubjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const createSubject = createServerFn({ method: "POST" })
  .validator((data: unknown) => createSubjectSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedSubject> => {
    logger.info("Creating subject", { title: data.title });

    const webRequest = getWebRequest();
    if (!webRequest) {
      throw new Error("No web request context available");
    }
    const { headers } = webRequest;
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      const subject = await prisma.subject.create({
        data: {
          title: data.title,
          initiallyFamiliarConcepts: [],
          userId: session.user.id,
        },
      });
      logger.info("Subject created successfully", { id: subject.id, userId: session.user.id });
      return serializeSubject(subject);
    } catch (error) {
      logger.error("Failed to create subject", {
        error: error instanceof Error ? error.message : "Unknown error",
        title: data.title,
        userId: session.user.id,
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

    const webRequest = getWebRequest();
    if (!webRequest) {
      throw new Error("No web request context available");
    }
    const { headers } = webRequest;
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      const updatedSubject = await prisma.subject.update({
        where: { id, userId: session.user.id },
        data: updateData,
      });

      logger.info("Subject updated successfully", { id, userId: session.user.id });
      return serializeSubject(updatedSubject);
    } catch (error) {
      logger.error("Failed to update subject", {
        error: error instanceof Error ? error.message : "Unknown error",
        id,
        updateData,
        userId: session.user.id,
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

    const webRequest = getWebRequest();
    if (!webRequest) {
      throw new Error("No web request context available");
    }
    const { headers } = webRequest;
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      const subjects = await prisma.subject.findMany({
        where: { userId: session.user.id },
      });
      logger.info("Subjects fetched successfully", {
        count: subjects.length,
        userId: session.user.id,
      });
      return subjects.map(serializeSubject);
    } catch (error) {
      logger.error("Failed to fetch subjects", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: session.user.id,
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

    const webRequest = getWebRequest();
    if (!webRequest) {
      throw new Error("No web request context available");
    }
    const { headers } = webRequest;
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      const subject = await prisma.subject.findUnique({
        where: { id: data.id, userId: session.user.id },
      });

      if (!subject) {
        logger.warn("Subject not found", { id: data.id, userId: session.user.id });
        return null;
      }

      logger.info("Subject fetched successfully", { id: data.id, userId: session.user.id });
      return serializeSubject(subject);
    } catch (error) {
      logger.error("Failed to fetch subject", {
        error: error instanceof Error ? error.message : "Unknown error",
        id: data.id,
        userId: session.user.id,
      });
      throw error;
    }
  });
