import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { ErrorDisplay } from "@/components/error-display";
import LearningInterface from "@/components/learning-interface";
import Loading from "@/components/ui/loading";
import { useSession } from "@/lib/auth-client";
import { Logger } from "@/lib/logger";
import { createArticle, getArticle } from "@/prisma/articles";
import { getOrCreateLearningMap } from "@/prisma/learning-maps";
import { getSubject } from "@/prisma/subjects";

const logger = new Logger({ context: "LearningRouteLoader", enabled: false });

export const Route = createFileRoute("/learning/$subjectId")({
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

    const rootArticleExists = learningMap.articles?.some((article) => article.isRoot) ?? false;

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
    const router = useRouter();
    const { data: session, isPending, isRefetching } = useSession();

    const initialRootArticle = learningMap.articles?.find((article) => article.isRoot) || null;
    const { data: rootArticle } = useQuery({
      queryKey: ["article", initialRootArticle?.id],
      queryFn: () => getArticle({ data: { id: initialRootArticle?.id ?? "" } }),
      initialData: initialRootArticle,
      enabled: !!initialRootArticle?.id,
    });

    useEffect(() => {
      if (!isPending && !isRefetching && !session) {
        router.navigate({ to: "/auth" });
      }
    }, [session, isPending, isRefetching, router]);

    if (isPending || isRefetching) {
      return <Loading context="default" progress={50} />;
    }

    if (!session) {
      return null;
    }

    return (
      <LearningInterface subject={subject} learningMap={learningMap} activeArticle={rootArticle} />
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
