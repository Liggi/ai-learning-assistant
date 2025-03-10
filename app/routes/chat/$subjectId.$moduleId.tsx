import ChatLayout from "@/components/chat-layout";
import { createFileRoute } from "@tanstack/react-router";
import { getSubjectWithCurriculumMap } from "@/prisma/subjects";
import { ErrorDisplay } from "@/components/error-display";
import ChatLayoutNew from "@/components/chat-layout-new";

export const Route = createFileRoute("/chat/$subjectId/$moduleId")({
  loader: async ({ params }) => {
    const { subjectId, moduleId } = params;
    const subject = await getSubjectWithCurriculumMap({
      data: { id: subjectId },
    });

    console.log("loading chat route");

    if (!subject) {
      throw new Error(`Subject with ID ${subjectId} not found`);
    }

    // Find the module node in the curriculum map
    const moduleNode = subject?.curriculumMap?.nodes.find(
      (node) => node.id === moduleId
    );

    if (!moduleNode) {
      throw new Error(
        `Module with ID ${moduleId} not found in subject ${subject.title}`
      );
    }

    // Ensure all required data is present
    if (!moduleNode.data?.label) {
      throw new Error(`Module ${moduleId} is missing required data (label)`);
    }

    return {
      moduleDetails: {
        subject: subject.title,
        moduleTitle: moduleNode.data.label,
        moduleDescription: moduleNode.data.description || "",
        message: `Explain ${moduleNode.data.label} to a beginner developer`,
      },
      subjectId,
      moduleId,
    };
  },
  component: Chat,
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

function Chat() {
  const { moduleDetails, subjectId, moduleId } = Route.useLoaderData();

  return (
    <ChatLayoutNew
      moduleDetails={moduleDetails}
      subjectId={subjectId}
      moduleId={moduleId}
    />
  );
}
