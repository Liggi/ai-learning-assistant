import RoadmapView from "@/components/roadmap-view";
import { useSubjectWithRoadmap } from "@/hooks/api/subjects";
import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "LearningMapRoute" });

export const Route = createFileRoute("/learning-map/$subjectId")({
  component: LearningMap,
});

function LearningMap() {
  const { subjectId } = useParams({ from: "/learning-map/$subjectId" });
  const router = useRouter();
  const { data: loadedSubject } = useSubjectWithRoadmap(subjectId);

  logger.info("Loading subject with roadmap", {
    subjectId,
    hasSubject: !!loadedSubject,
    hasRoadmap: !!loadedSubject?.roadmap,
  });

  if (!loadedSubject?.roadmap) {
    logger.warn("No roadmap found", { subjectId });
    return null;
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
