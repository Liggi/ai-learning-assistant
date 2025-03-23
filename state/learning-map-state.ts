import { atom } from "jotai";
import type {
  SerializedArticle,
  SerializedQuestion,
  SerializedLearningMap,
} from "@/types/serialized";
import type { Node, Edge } from "@xyflow/react";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "LearningMapState", enabled: true });

// Core atoms for essential state
export const learningMapIdAtom = atom<string | null>(null);
export const activeArticleIdAtom = atom<string | null>(null);
export const rootArticleIdAtom = atom<string | null>(null);

// Question context atom for tracking the current question-article relationship
export const questionContextAtom = atom<{
  id: string;
  text: string;
  sourceArticleId: string;
} | null>(null);

// Data cache atoms
export const articlesAtom = atom<SerializedArticle[]>([]);
export const questionsAtom = atom<SerializedQuestion[]>([]);

// Flow visualization atoms
export const flowNodesAtom = atom<Node[]>([]);
export const flowEdgesAtom = atom<Edge[]>([]);

// UI state atoms
export const sidebarOpenAtom = atom<boolean>(true);
export const mapZoomAtom = atom<number>(1);
export const mapViewportAtom = atom<{ x: number; y: number; zoom: number }>({
  x: 0,
  y: 0,
  zoom: 1,
});

// Flow control states
export const isGeneratingArticleAtom = atom<boolean>(false);
export const isStreamingContentAtom = atom<boolean>(false);

// Derived atom for the currently active article
export const activeArticleAtom = atom((get) => {
  const articles = get(articlesAtom);
  const activeId = get(activeArticleIdAtom);
  return activeId ? articles.find((a) => a.id === activeId) : null;
});

// Derived atom for the root article
export const rootArticleAtom = atom((get) => {
  const articles = get(articlesAtom);
  const rootId = get(rootArticleIdAtom);

  if (rootId) {
    return articles.find((a) => a.id === rootId) || null;
  }

  // Fallback to first root article in the list if rootId is not set
  return articles.find((a) => a.isRoot) || null;
});

// Derived atom for tracking whether we have any articles
export const hasArticlesAtom = atom((get) => get(articlesAtom).length > 0);

// Atom to indicate if the flow view needs recalculation
export const flowNeedsUpdateAtom = atom<boolean>(true);

// Action atom for selecting a node
export const selectNodeAtom = atom(
  null, // getter returns null
  (get, set, nodeId: string) => {
    logger.info("Node selected", { nodeId });

    const articles = get(articlesAtom);
    const questions = get(questionsAtom);

    // Check if the node is an article
    const isArticle = articles.some((a) => a.id === nodeId);

    if (isArticle) {
      // If it's an article, simply set it as active
      set(activeArticleIdAtom, nodeId);
      set(questionContextAtom, null);
    } else {
      // It must be a question
      const question = questions.find((q) => q.id === nodeId);

      if (!question) {
        logger.error("Question not found", { nodeId });
        return;
      }

      // If question has a destination article, navigate to it
      if (question.destinationArticleId) {
        set(activeArticleIdAtom, question.destinationArticleId);
        set(questionContextAtom, {
          id: question.id,
          text: question.text,
          sourceArticleId: question.articleId,
        });
      } else {
        // Question doesn't have a destination article yet
        // This would normally trigger article creation
        // Set the context so it can be used by the creation process
        set(questionContextAtom, {
          id: question.id,
          text: question.text,
          sourceArticleId: question.articleId,
        });
      }
    }
  }
);

// Action atom for initializing the learning map
export const initializeLearningMapAtom = atom(
  null,
  (get, set, learningMap: SerializedLearningMap) => {
    logger.info("Initializing learning map state", {
      learningMapId: learningMap.id,
      articleCount: learningMap.articles?.length || 0,
    });

    set(learningMapIdAtom, learningMap.id);

    if (learningMap.articles && learningMap.articles.length > 0) {
      // Extract all articles
      set(articlesAtom, learningMap.articles);

      // Extract all questions from all articles
      const allQuestions = learningMap.articles.flatMap((article) =>
        article.questions.map((q) => ({
          ...q,
          sourceArticle: {
            id: article.id,
            isRoot: article.isRoot,
            learningMapId: article.learningMapId,
          },
        }))
      );
      set(questionsAtom, allQuestions);

      // Find the root article
      const rootArticle = learningMap.articles.find((a) => a.isRoot);
      if (rootArticle) {
        set(rootArticleIdAtom, rootArticle.id);
        // Also set as active article if no active article is set
        if (!get(activeArticleIdAtom)) {
          set(activeArticleIdAtom, rootArticle.id);
        }
      }

      // Mark the flow as needing an update
      set(flowNeedsUpdateAtom, true);
    }
  }
);

// Action atom for adding a new article
export const addArticleAtom = atom(
  null,
  (get, set, article: SerializedArticle) => {
    logger.info("Adding article", { articleId: article.id });

    const articles = [...get(articlesAtom)];

    // Check if the article already exists
    const existingIndex = articles.findIndex((a) => a.id === article.id);

    if (existingIndex >= 0) {
      // Replace the existing article
      articles[existingIndex] = article;
    } else {
      // Add the new article
      articles.push(article);
    }

    set(articlesAtom, articles);

    // If this is the first article and it's a root article, set it as the root
    if (articles.length === 1 && article.isRoot) {
      set(rootArticleIdAtom, article.id);
    }

    // Mark the flow as needing an update
    set(flowNeedsUpdateAtom, true);
  }
);

// Action atom for updating an article
export const updateArticleAtom = atom(
  null,
  (get, set, updates: Partial<SerializedArticle> & { id: string }) => {
    logger.info("Updating article", { articleId: updates.id });

    const articles = [...get(articlesAtom)];
    const index = articles.findIndex((a) => a.id === updates.id);

    if (index >= 0) {
      articles[index] = { ...articles[index], ...updates };
      set(articlesAtom, articles);

      // Mark the flow as needing an update
      set(flowNeedsUpdateAtom, true);
    }
  }
);

// Action atom for adding a new question
export const addQuestionAtom = atom(
  null,
  (get, set, question: SerializedQuestion) => {
    logger.info("Adding question", { questionId: question.id });

    const questions = [...get(questionsAtom)];

    // Check if the question already exists
    const existingIndex = questions.findIndex((q) => q.id === question.id);

    if (existingIndex >= 0) {
      // Replace the existing question
      questions[existingIndex] = question;
    } else {
      // Add the new question
      questions.push(question);
    }

    set(questionsAtom, questions);

    // Mark the flow as needing an update
    set(flowNeedsUpdateAtom, true);
  }
);

// Action atom for updating the flow visualization
export const updateFlowAtom = atom(
  null,
  (get, set, { nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
    set(flowNodesAtom, nodes);
    set(flowEdgesAtom, edges);
    set(flowNeedsUpdateAtom, false);
  }
);

// Action atom to save node positions
export const saveNodePositionsAtom = atom(
  null,
  (get, set, nodePositions: Record<string, { x: number; y: number }>) => {
    const articles = [...get(articlesAtom)];
    const questions = [...get(questionsAtom)];

    // Update article positions
    const updatedArticles = articles.map((article) => {
      const position = nodePositions[article.id];
      if (position) {
        return {
          ...article,
          positionX: position.x,
          positionY: position.y,
        };
      }
      return article;
    });

    // Update question positions
    const updatedQuestions = questions.map((question) => {
      const position = nodePositions[question.id];
      if (position) {
        return {
          ...question,
          positionX: position.x,
          positionY: position.y,
        };
      }
      return question;
    });

    set(articlesAtom, updatedArticles);
    set(questionsAtom, updatedQuestions);
  }
);
