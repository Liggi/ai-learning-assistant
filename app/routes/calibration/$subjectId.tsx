import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { Logger } from "@/lib/logger";
import ExistingKnowledgeCalibration from "@/components/existing-knowledge-calibration";
import { useSubject } from "@/hooks/api/subjects";

const logger = new Logger({ context: "CalibrationRoute" });

export const Route = createFileRoute("/calibration/$subjectId")({
  component: Calibration,
});

function Calibration() {
  const { subjectId } = useParams({ from: "/calibration/$subjectId" });
  const { data: subject } = useSubject(subjectId);
  const router = useRouter();

  if (!subject) {
    return <div>Subject not found</div>;
  }

  return (
    <ExistingKnowledgeCalibration
      subject={subject}
      onBack={() => {
        logger.info("Returning to subject selection");
        // @TODO: Delete the subject and go back
      }}
      onNext={async () => {
        await router.navigate({
          to: "/learning-map/$subjectId",
          params: { subjectId: subjectId },
        });
      }}
    />
  );
}
