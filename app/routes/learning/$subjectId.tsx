import { createFileRoute } from "@tanstack/react-router";
import { ErrorDisplay } from "@/components/error-display";
import LearningInterface from "@/components/learning-interface";
import { getSubject } from "@/prisma/subjects";
import { getOrCreateLearningMap } from "@/prisma/learning-maps";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "LearningRouteLoader" });

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
    const learningMap = await getOrCreateLearningMap({
      data: { subjectId },
    });

    logger.info("Learning map found/created in loader", {
      learningMapId: learningMap.id,
      hasArticles: learningMap.articles?.length || 0 > 0,
    });

    return {
      subject,
    };
  },
  component: function LearningRoute() {
    const { subject } = Route.useLoaderData();
    return <LearningInterface subject={subject} />;
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
