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
type PrismaArticle = z.infer<typeof ArticleSchema> & {
  questions?: {
    id: string;
    text: string;
    articleId: string;
    destinationArticleId?: string | null;
    destinationArticle?: {
      id: string;
      isRoot: boolean;
      learningMapId: string;
    } | null;
    positionX?: number | null;
    positionY?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  answerToQuestions?: {
    id: string;
    text: string;
    articleId: string;
    sourceArticle?: {
      id: string;
      isRoot: boolean;
      learningMapId: string;
    } | null;
    positionX?: number | null;
    positionY?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  positionX?: number | null;
  positionY?: number | null;
};

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

  // Process questions array, including nested destinationArticle if present
  const serializedQuestions =
    article.questions?.map((question) => {
      // Basic question serialization
      const serializedQuestion: {
        id: string;
        text: string;
        articleId: string;
        destinationArticleId: string | null;
        positionX: number | null;
        positionY: number | null;
        createdAt: string;
        updatedAt: string;
        destinationArticle?: {
          id: string;
          isRoot: boolean;
          learningMapId: string;
        };
      } = {
        id: question.id,
        text: question.text,
        articleId: question.articleId,
        destinationArticleId: question.destinationArticleId || null,
        positionX: question.positionX || null,
        positionY: question.positionY || null,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      };

      // If the question includes a destinationArticle (nested), add basic info
      if (question.destinationArticle) {
        serializedQuestion.destinationArticle = {
          id: question.destinationArticle.id,
          isRoot: question.destinationArticle.isRoot,
          learningMapId: question.destinationArticle.learningMapId,
        };
      }

      return serializedQuestion;
    }) || [];

  // Process answerToQuestions if present
  const serializedAnswerToQuestions =
    article.answerToQuestions?.map((question) => {
      return {
        id: question.id,
        text: question.text,
        articleId: question.articleId,
        destinationArticleId: article.id, // This article is the destination
        positionX: question.positionX || null,
        positionY: question.positionY || null,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
        sourceArticle: question.sourceArticle
          ? {
              id: question.sourceArticle.id,
              isRoot: question.sourceArticle.isRoot,
              learningMapId: question.sourceArticle.learningMapId,
            }
          : undefined,
      };
    }) || [];

  // Return the serialized article with all related data
  return {
    ...article,
    tooltips: article.tooltips as Record<string, string>,
    positionX: article.positionX || null,
    positionY: article.positionY || null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    questions: serializedQuestions,
    answerToQuestions: serializedAnswerToQuestions,
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
