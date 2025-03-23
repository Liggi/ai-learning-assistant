import { z } from "zod";

/**
 * Zod schema for article metadata
 */
export const ArticleMetadataSchema = z.object({
  summary: z.string().optional(),
  takeaways: z.array(z.string()).optional(),
});

/**
 * Type for article metadata derived from the Zod schema
 */
export type ArticleMetadata = z.infer<typeof ArticleMetadataSchema>;

/**
 * Type for a minimal article reference (used in relationship references)
 */
export type SerializedArticleReference = {
  id: string;
  isRoot: boolean;
  learningMapId: string;
};

/**
 * Type for serialized question data
 */
export type SerializedQuestion = {
  id: string;
  text: string;
  articleId: string;
  destinationArticleId: string | null;
  positionX: number | null;
  positionY: number | null;
  createdAt: string;
  updatedAt: string;
  destinationArticle?: SerializedArticleReference;
  sourceArticle?: SerializedArticleReference;
};

/**
 * Type for serialized article data
 */
export type SerializedArticle = {
  id: string;
  content: string;
  summary: string;
  takeaways: string[];
  tooltips: Record<string, string>;
  learningMapId: string;
  isRoot: boolean;
  positionX: number | null;
  positionY: number | null;
  createdAt: string;
  updatedAt: string;
  questions: SerializedQuestion[];
  answerToQuestions: SerializedQuestion[];
};

/**
 * Type for serialized learning map data
 */
export type SerializedLearningMap = {
  id: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
  articles?: SerializedArticle[];
};

/**
 * Type for serialized subject data
 */
export type SerializedSubject = {
  id: string;
  title: string;
  initiallyFamiliarConcepts?: string[];
  createdAt: string;
  updatedAt: string;
};
