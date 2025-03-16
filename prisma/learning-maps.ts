import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import { Logger } from "@/lib/logger";
import { SerializedLearningMap } from "@/types/serialized";
import { serializeLearningMap } from "@/types/serializers";

const logger = new Logger({ context: "LearningMapService" });

const getOrCreateLearningMapSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
});

export const getOrCreateLearningMap = createServerFn({ method: "POST" })
  .validator((data: unknown) => getOrCreateLearningMapSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedLearningMap> => {
    const { subjectId } = data;

    logger.info("Getting or creating learning map", { subjectId });

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      logger.error("Subject not found", { subjectId });
      throw new Error(`Subject not found: ${subjectId}`);
    }

    // Find existing learning map for this subject
    const existingMap = await prisma.learningMap.findFirst({
      where: { subjectId },
      include: {
        articles: true,
      },
    });

    // Return existing map if found
    if (existingMap) {
      logger.info("Found existing learning map", { id: existingMap.id });
      return serializeLearningMap(existingMap);
    }

    // Create new learning map if none exists
    logger.info("Creating new learning map for subject", { subjectId });
    const newMap = await prisma.learningMap.create({
      data: {
        subjectId,
      },
      include: { articles: true },
    });

    return serializeLearningMap(newMap);
  });
