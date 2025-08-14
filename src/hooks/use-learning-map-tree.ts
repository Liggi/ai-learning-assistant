import { useMemo } from "react";
import type {
  SerializedArticle,
  SerializedLearningMap,
  SerializedQuestion,
} from "@/types/serialized";

export interface TreeArticleNode {
  id: string;
  type: "article";
  data: SerializedArticle;
  outgoingQuestions: TreeQuestionNode[];
}

export interface TreeQuestionNode {
  id: string;
  type: "question";
  data: SerializedQuestion;
  childArticle: TreeArticleNode | null;
}

export function useLearningMapTree(
  learningMap: SerializedLearningMap | null | undefined
): TreeArticleNode | null {
  return useMemo(() => {
    if (!learningMap?.articles || !learningMap.questions) {
      return null;
    }

    if (learningMap.articles.length > 1 && learningMap.questions.length === 0) {
      return null;
    }

    // Create maps for quick lookups
    const articlesMap = new Map<string, SerializedArticle>();
    const questionsByParentId = new Map<string, SerializedQuestion[]>();
    const questionsByChildId = new Map<string, SerializedQuestion[]>();

    // Populate the maps
    learningMap.articles.forEach((article) => {
      articlesMap.set(article.id, article);
    });

    learningMap.questions.forEach((question) => {
      // Group questions by parent article ID
      if (!questionsByParentId.has(question.parentArticleId)) {
        questionsByParentId.set(question.parentArticleId, []);
      }
      questionsByParentId.get(question.parentArticleId)?.push(question);

      // Group questions by child article ID
      if (!questionsByChildId.has(question.childArticleId)) {
        questionsByChildId.set(question.childArticleId, []);
      }
      questionsByChildId.get(question.childArticleId)?.push(question);
    });

    // Find the root article (the only article not pointed to by any question)
    const rootArticleId = learningMap.articles.find(
      (article) => !questionsByChildId.has(article.id)
    )?.id;

    if (!rootArticleId) {
      console.error("No root article found in learning map");
      return null;
    }

    // Build the tree recursively
    const buildArticleNode = (
      articleId: string,
      visitedIds = new Set<string>()
    ): TreeArticleNode | null => {
      // Prevent infinite loops from circular references
      if (visitedIds.has(articleId)) {
        return null;
      }

      const newVisitedIds = new Set(visitedIds);
      newVisitedIds.add(articleId);

      const article = articlesMap.get(articleId);
      if (!article) {
        return null;
      }

      const outgoingQuestions: TreeQuestionNode[] = [];
      const parentQuestions = questionsByParentId.get(articleId) || [];

      for (const question of parentQuestions) {
        const childArticle = buildArticleNode(question.childArticleId, newVisitedIds);

        outgoingQuestions.push({
          id: question.id,
          type: "question",
          data: question,
          childArticle,
        });
      }

      return {
        id: articleId,
        type: "article",
        data: article,
        outgoingQuestions,
      };
    };

    return buildArticleNode(rootArticleId);
  }, [learningMap]);
}
