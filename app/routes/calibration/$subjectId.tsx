import { createFileRoute, useParams, useRouter, redirect } from "@tanstack/react-router";
import { Logger } from "@/lib/logger";
import Calibration from "@/components/calibration/calibration";
import { useSubject, useUpdateSubject } from "@/hooks/api/subjects";
import Loading from "@/components/ui/loading";
import { toast } from "sonner";
import { getSession } from "@/lib/auth-client";

const logger = new Logger({ context: "CalibrationRoute" });

export const Route = createFileRoute("/calibration/$subjectId")({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: "/auth" })
    }
  },
  component: function CalibrationRoute() {
    const { subjectId } = useParams({ from: "/calibration/$subjectId" });
    const { data: subject, isLoading } = useSubject(subjectId);
    const router = useRouter();
    const updateSubject = useUpdateSubject();

    if (isLoading) {
      return <Loading context="calibration" progress={90} />;
    }

    if (!subject) {
      return <div>Subject not found</div>;
    }

    const handleCalibrationComplete = async (selectedConcepts: string[]) => {
      logger.info("Saving calibration results", {
        subjectId,
        conceptCount: selectedConcepts.length,
      });

      try {
        await updateSubject.mutateAsync({
          id: subjectId,
          data: { initiallyFamiliarConcepts: selectedConcepts },
        });

        await router.navigate({
          to: "/learning/$subjectId",
          params: { subjectId },
        });
      } catch (error) {
        logger.error("Failed to save calibration results", {
          error: error instanceof Error ? error.message : "Unknown error",
        });

        toast.error("Failed to save calibration", {
          description:
            "Please try again or contact support if the problem persists.",
        });
      }
    };

    return (
      <Calibration
        subject={subject}
        onBack={() => {
          logger.info("Returning to subject selection");
        }}
        onNext={async (concepts: string[]) => {
          await handleCalibrationComplete(concepts);
        }}
      />
    );
  },
});
