import RoadmapView from "@/components/roadmap-view";
import { useSubjectWithRoadmap } from "@/hooks/api/subjects";
import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Logger } from "@/lib/logger";
import Loading from "@/components/ui/loading";

const logger = new Logger({ context: "LearningMapRoute" });

export const Route = createFileRoute("/learning-map/$subjectId")({
  component: LearningMap,
});

function LearningMap() {
  const { subjectId } = useParams({ from: "/learning-map/$subjectId" });
  const router = useRouter();
  const { data: loadedSubject, isLoading } = useSubjectWithRoadmap(subjectId);

  logger.info("Loading subject with roadmap", {
    subjectId,
    hasSubject: !!loadedSubject,
    hasRoadmap: !!loadedSubject?.roadmap,
    isLoading,
  });

  if (isLoading) {
    return <Loading progress={95} context="roadmapLoading" />;
  }

  if (!loadedSubject?.roadmap) {
    logger.warn("No roadmap found", { subjectId });
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0B0D11] text-white">
        <div className="text-center">
          <p className="text-lg mb-4">No roadmap found for this subject</p>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  const { nodes, edges } = loadedSubject.roadmap;
  logger.info("Rendering roadmap", {
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });

  return (
    <motion.div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ width: "100%", height: "100%", position: "absolute" }}>
        <RoadmapView
          nodes={nodes}
          edges={edges}
          onNodeClick={(node) => {
            router.navigate({
              to: "/chat/$subjectId/$moduleId",
              params: { subjectId, moduleId: node.id },
            });
          }}
          onReset={() => {}}
        />
      </div>
    </motion.div>
  );
}
