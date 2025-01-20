import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Calibration from "@/components/features/calibration";

export const Route = createFileRoute("/wizard/calibration")({
  component: CalibrationRoute,
});

function CalibrationRoute() {
  const navigate = useNavigate();

  const handleNext = () => {
    // Possibly gather selected knowledge nodes from context
    // navigate({ to: '/wizard/roadmap' })
  };

  const handleBack = () => {
    navigate({ to: "/wizard/subject" });
  };

  return <Calibration onBack={handleBack} onNext={handleNext} />;
}
