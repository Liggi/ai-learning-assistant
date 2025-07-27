import { createFileRoute, redirect } from "@tanstack/react-router";
import { ErrorDisplay } from "@/components/error-display";
import LearningInterface from "@/components/learning-interface";
import { getSubject } from "@/prisma/subjects";
import { getOrCreateLearningMap } from "@/prisma/learning-maps";
import { createArticle, getArticle } from "@/prisma/articles";
import { Logger } from "@/lib/logger";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/lib/auth-client";

const logger = new Logger({ context: "LearningRouteLoader" });

export const Route = createFileRoute("/learning/$subjectId")({
  beforeLoad: async () => {
    const { data: session } = await getSession()
    if (!session) {
      throw redirect({ to: "/auth" })
    }
  },
  loader: async ({ params }) => {
    const { subjectId } = params;
    logger.info("Loading subject", { subjectId });
    const subject = await getSubject({
      data: { id: subjectId },
    });

    if (!subject) {
      logger.error("Subject not found", { subjectId });
      throw new Error(`Subject with ID ${subjectId} not found`);
    }

    logger.info("Finding or creating learning map via server fn", {
      subjectId,
    });
    let learningMap = await getOrCreateLearningMap({
      data: { subjectId },
    });

    logger.info("Initial learning map fetched", {
      learningMapId: learningMap.id,
      articleCount: learningMap.articles?.length || 0,
    });

    const rootArticleExists =
      learningMap.articles?.some((article) => article.isRoot) ?? false;

    if (!rootArticleExists) {
      logger.info("Root article does not exist, creating...", {
        learningMapId: learningMap.id,
      });
      await createArticle({
        data: {
          learningMapId: learningMap.id,
          isRoot: true,
          content: "",
        },
      });
      logger.info("Root article created, refetching learning map...", {
        learningMapId: learningMap.id,
      });
      learningMap = await getOrCreateLearningMap({
        data: { subjectId },
      });
      logger.info("Learning map refetched after root article creation", {
        learningMapId: learningMap.id,
        articleCount: learningMap.articles?.length || 0,
      });
    } else {
      logger.info("Root article already exists", {
        learningMapId: learningMap.id,
      });
    }

    // Find root article and redirect to article route
    const rootArticle = learningMap.articles?.find((article) => article.isRoot);
    if (rootArticle) {
      logger.info("Redirecting to root article", {
        rootArticleId: rootArticle.id,
      });
      throw redirect({
        to: "/learning/article/$articleId",
        params: { articleId: rootArticle.id },
      });
    }

    return {
      subject,
      learningMap,
    };
  },
  component: function LearningRoute() {
    const { subject, learningMap } = Route.useLoaderData();

    const initialRootArticle =
      learningMap.articles?.find((article) => article.isRoot) || null;

    // Add this React Query hook
    const { data: rootArticle } = useQuery({
      queryKey: ["article", initialRootArticle?.id],
      queryFn: () => getArticle({ data: { id: initialRootArticle?.id ?? "" } }),
      initialData: initialRootArticle,
      enabled: !!initialRootArticle?.id,
    });

    return (
      <LearningInterface
        subject={subject}
        learningMap={learningMap}
        activeArticle={rootArticle}
      />
    );
  },
  errorComponent: ({ error }) => {
    logger.error("Error in LearningRoute loader/component", {
      error: error.message,
    });
    return (
      <ErrorDisplay
        title="Error Loading Module"
        message={
          error.message ||
          "Failed to load the requested module. Please try again or select a different module."
        }
      />
    );
  },
});
