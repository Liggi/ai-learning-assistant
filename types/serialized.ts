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
  parentQuestion?: SerializedQuestion;
  childQuestions?: SerializedQuestion[];
  createdAt: string;
  updatedAt: string;
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
  questions?: SerializedQuestion[];
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

/**
 * Type for serialized question data
 */
export type SerializedQuestion = {
  id: string;
  text: string;
  learningMapId: string;
  parentArticleId: string;
  childArticleId: string;
  createdAt: string;
  updatedAt: string;
};
