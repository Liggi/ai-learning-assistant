import { createFileRoute, useNavigate } from "@tanstack/react-router";
import LearningRoadmap from "@/components/features/learning-roadmap";

export const Route = createFileRoute("/wizard/roadmap")({
  component: RoadmapRoute,
});

function RoadmapRoute() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full relative">
      <LearningRoadmap
        roadmap={{
          nodes: [],
          edges: [],
        }}
      />
      <button
        onClick={() => navigate({ to: "/wizard/subject" })}
        className="absolute top-4 left-4"
      >
        Create a new roadmap
      </button>
    </div>
  );
}
