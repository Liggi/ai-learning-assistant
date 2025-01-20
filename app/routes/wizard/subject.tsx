import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SubjectChoiceDialog from "@/components/features/subject-choice-dialog";

export const Route = createFileRoute("/wizard/subject")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <SubjectChoiceDialog
      onConfirm={() => navigate({ to: "/wizard/calibration" })}
    />
  );
}
