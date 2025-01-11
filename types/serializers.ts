import { z } from "zod";
import { Logger } from "@/lib/logger";
import {
  SerializedSubject,
  SerializedArticle,
  ArticleMetadata,
  ArticleMetadataSchema,
  SerializedLearningMap,
} from "./serialized";
import { SubjectSchema } from "@/prisma/generated/zod";
import { ArticleSchema } from "@/prisma/generated/zod";
import { toPrismaJson } from "@/utils/json";

const logger = new Logger({ context: "Serializers", enabled: false });

// Type for Prisma Subject
type PrismaSubject = z.infer<typeof SubjectSchema>;

// Type for Prisma Article
type PrismaArticle = z.infer<typeof ArticleSchema>;

/**
 * Schema for validating serialized subjects
 */
export const SerializedSubjectSchema = SubjectSchema.extend({
  initiallyFamiliarConcepts: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Serializes a Subject from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeSubject(subject: PrismaSubject): SerializedSubject {
  logger.debug("Serializing subject", { id: subject.id });

  return SerializedSubjectSchema.parse({
    ...subject,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
  });
}

/**
 * Serializes an Article from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeArticle(article: PrismaArticle): SerializedArticle {
  logger.debug("Serializing article", { id: article.id });

  return {
    ...article,
    tooltips: article.tooltips as Record<string, string>,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  };
}

/**
 * Validates article metadata and converts it to Prisma-compatible JSON
 * Used when updating an article with new metadata
 * @deprecated Use direct summary and takeaways fields instead
 */
export function validateAndFormatMetadata(metadata: ArticleMetadata) {
  logger.debug("Validating article metadata");
  const validatedMetadata = ArticleMetadataSchema.parse(metadata);
  return toPrismaJson(validatedMetadata);
}

/**
 * Serializes a LearningMap from the database to a client-friendly format
 * Converts Date objects to ISO strings and serializes nested articles
 */
export function serializeLearningMap(learningMap: any): SerializedLearningMap {
  logger.debug("Serializing learning map", { id: learningMap.id });

  return {
    ...learningMap,
    createdAt: learningMap.createdAt.toISOString(),
    updatedAt: learningMap.updatedAt.toISOString(),
    articles: learningMap.articles
      ? learningMap.articles.map((article: any) => serializeArticle(article))
      : undefined,
  };
}
