import ChatLayout from "@/components/chat-layout";
import { useSubjectWithRoadmap } from "@/hooks/api/subjects";
import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import type { RoadmapNodeData } from "@/types/roadmap";

export const Route = createFileRoute("/chat/$subjectId/$moduleId")({
  component: LearningMap,
});

function LearningMap() {
  const { subjectId, moduleId } = useParams({
    from: "/chat/$subjectId/$moduleId",
  });
  const router = useRouter();
  const { data: loadedSubject } = useSubjectWithRoadmap(subjectId);

  if (!loadedSubject?.roadmap) return null;

  const nodeData = loadedSubject.roadmap.nodes.find(
    (node) => node.id === moduleId
  )?.data;

  return (
    <ChatLayout
      node={nodeData}
      subject={loadedSubject.title}
      onBack={() => {
        router.navigate({
          to: "/learning-map/$subjectId",
          params: { subjectId },
        });
      }}
      onShowRoadmap={() => {
        router.navigate({
          to: "/learning-map/$subjectId",
          params: { subjectId },
        });
      }}
      roadmapNodes={loadedSubject.roadmap.nodes}
      roadmapEdges={loadedSubject.roadmap.edges}
    />
  );
}
