import CurriculumMapView from "@/components/curriculum-map-view";
import { useSubjectWithCurriculumMap } from "@/hooks/api/subjects";
import {
  createFileRoute,
  useParams,
  useRouter,
  Link,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Logger } from "@/lib/logger";
import Loading from "@/components/ui/loading";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

const logger = new Logger({ context: "LearningMapRoute" });

export const Route = createFileRoute("/learning-map/$subjectId")({
  component: LearningMap,
});

function LearningMap() {
  const { subjectId } = useParams({ from: "/learning-map/$subjectId" });
  const router = useRouter();
  const navigate = useNavigate();
  const instanceId = useMemo(() => Math.random().toString(36).substring(7), []);

  useEffect(() => {
    logger.info(`LearningMap component MOUNTED - instance ${instanceId}`);

    return () => {
      logger.info(`LearningMap component UNMOUNTED - instance ${instanceId}`);
    };
  }, [instanceId]);

  const { data: loadedSubject, isLoading } =
    useSubjectWithCurriculumMap(subjectId);

  logger.info("Loading subject with curriculum map", {
    subjectId,
    hasSubject: !!loadedSubject,
    hasCurriculumMap: !!loadedSubject?.curriculumMap,
    isLoading,
    instanceId,
  });

  if (isLoading) {
    return <Loading progress={95} context="curriculumMapLoading" />;
  }

  if (!loadedSubject?.curriculumMap) {
    logger.warn("No curriculum map found", { subjectId });
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0B0D11] text-white">
        <div className="text-center">
          <p className="text-lg mb-4">
            No curriculum map found for this subject
          </p>
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

  const { nodes, edges } = loadedSubject.curriculumMap;
  logger.info("Rendering curriculum map", {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    instanceId,
  });

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        viewTransitionName: "page",
      }}
      className="bg-[#0B0D11] text-white"
    >
      <div style={{ width: "100%", height: "100%", position: "absolute" }}>
        <CurriculumMapView
          nodes={nodes}
          edges={edges}
          onNodeClick={(node) => {
            logger.info(`Node clicked: ${node.id} from instance ${instanceId}`);

            // Use Link component in actual implementation
            navigate({
              to: "/chat/$subjectId/$moduleId",
              params: { subjectId, moduleId: node.id },
            });
          }}
          onReset={() => {}}
        />
      </div>
    </div>
  );
}
