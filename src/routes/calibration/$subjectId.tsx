import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import Calibration from "@/components/calibration/calibration";
import Loading from "@/components/ui/loading";
import { useSubject, useUpdateSubject } from "@/hooks/api/subjects";
import { useSession } from "@/lib/auth-client";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "CalibrationRoute", enabled: false });

export const Route = createFileRoute("/calibration/$subjectId")({
  component: function CalibrationRoute() {
    const { subjectId } = useParams({ from: "/calibration/$subjectId" });
    const { data: subject, isLoading } = useSubject(subjectId);
    const router = useRouter();
    const updateSubject = useUpdateSubject();
    const { data: session, isPending, isRefetching } = useSession();

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
          description: "Please try again or contact support if the problem persists.",
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
