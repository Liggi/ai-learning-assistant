import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/react-start";
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

    logger.info("Handler: Getting or creating learning map", { subjectId });

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      logger.error("Subject not found", { subjectId });
      throw new Error(`Subject not found: ${subjectId}`);
    }

    const existingMap = await prisma.learningMap.findFirst({
      where: { subjectId },
      include: {
        articles: true,
        questions: true,
      },
    });

    if (existingMap) {
      logger.info("Found existing learning map", { id: existingMap.id });
      return serializeLearningMap(existingMap);
    }

    logger.info("Creating new learning map for subject", { subjectId });
    const newMap = await prisma.learningMap.create({
      data: {
        subjectId,
      },
      include: { articles: true, questions: true },
    });

    return serializeLearningMap(newMap);
  });
