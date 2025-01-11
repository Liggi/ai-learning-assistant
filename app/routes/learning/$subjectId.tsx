import { createFileRoute } from "@tanstack/react-router";
import { ErrorDisplay } from "@/components/error-display";
import LearningInterface from "@/components/learning-interface";
import { getSubject } from "@/prisma/subjects";

export const Route = createFileRoute("/learning/$subjectId")({
  loader: async ({ params }) => {
    const { subjectId } = params;
    const subject = await getSubject({
      data: { id: subjectId },
    });

    if (!subject) {
      throw new Error(`Subject with ID ${subjectId} not found`);
    }

    return {
      subject,
    };
  },
  component: LearningRoute,
  errorComponent: ({ error }) => {
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

function LearningRoute() {
  const { subject } = Route.useLoaderData();

  return <LearningInterface subject={subject} />;
}
