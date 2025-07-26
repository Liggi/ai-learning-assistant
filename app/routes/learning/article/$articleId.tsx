import { createFileRoute, redirect } from "@tanstack/react-router";
import { ErrorDisplay } from "@/components/error-display";
import LearningInterface from "@/components/learning-interface";
import { getLearningMapAndSubjectForArticle } from "@/prisma/articles";
import { Logger } from "@/lib/logger";
import { useQuery } from "@tanstack/react-query";
import { getArticle } from "@/prisma/articles";
import { getSession } from "@/lib/auth-client";

const logger = new Logger({ context: "ArticleRouteLoader" });

export const Route = createFileRoute("/learning/article/$articleId")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/auth" })
    }
  },
  loader: async ({ params }) => {
    const { articleId } = params;
    logger.info("Loading article", { articleId });

    try {
      const result = await getLearningMapAndSubjectForArticle({
        data: { articleId },
      });

      logger.info("Article, learning map, and subject loaded", {
        articleId,
        learningMapId: result.learningMap.id,
        subjectId: result.subject.id,
      });

      return result;
    } catch (error) {
      logger.error("Error loading article data", { error, articleId });
      throw error;
    }
  },
  component: function ArticleRoute() {
    const {
      article: initialArticle,
      learningMap,
      subject,
    } = Route.useLoaderData();

    const { data: article } = useQuery({
      queryKey: ["article", initialArticle.id],
      queryFn: () => getArticle({ data: { id: initialArticle.id } }),
      initialData: initialArticle,
    });

    return (
      <LearningInterface
        subject={subject}
        learningMap={learningMap}
        activeArticle={article}
      />
    );
  },
  errorComponent: ({ error }) => {
    logger.error("Error in ArticleRoute loader/component", {
      error: error.message,
    });
    return (
      <ErrorDisplay
        title="Error Loading Article"
        message={
          error.message ||
          "Failed to load the requested article. Please try again or select a different module."
        }
      />
    );
  },
});
