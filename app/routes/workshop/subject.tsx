import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSubjectById } from "@/features/db/subjects";
import { getRoadmap } from "@/features/db/roadmap";
import { getCalibrationSettings } from "@/features/db/calibration";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CalibrationScreen from "@/components/calibration-screen";
import RoadmapView from "@/components/roadmap-view";
import Loading from "@/components/ui/loading";
import type { RoadmapNode, RoadmapEdge } from "@/features/roadmap/types";
import type { Subject } from "@prisma/client";

interface SearchParams {
  subjectId: string;
}

export const Route = createFileRoute("/workshop/subject")({
  component: SubjectPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    if (typeof search.subjectId !== "string") {
      throw new Error("subjectId must be a string");
    }
    return { subjectId: search.subjectId };
  },
});

function ViewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function SubjectPage() {
  const { subjectId } = Route.useSearch();
  const [isCalibrating, setIsCalibrating] = useState(true);

  const { data: subject, isLoading: isLoadingSubject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () =>
      getSubjectById({ data: { id: subjectId } }) as Promise<Subject | null>,
    enabled: !!subjectId,
  });

  const { data: roadmap, isLoading: isLoadingRoadmap } = useQuery({
    queryKey: ["roadmap", subjectId],
    queryFn: async () => {
      const result = await getRoadmap(subjectId);
      // Transform the data to match RoadmapNode type
      return {
        nodes: result.nodes.map(
          (node): RoadmapNode => ({
            id: node.id,
            type: node.type || "normalNode",
            position:
              typeof node.position === "string"
                ? JSON.parse(node.position)
                : node.position,
            data: {
              status: "not-started",
              label: node.title,
              title: node.title,
              description: node.description,
            },
          })
        ),
        edges: result.edges.map(
          (edge): RoadmapEdge => ({
            id: edge.id,
            source: edge.sourceId,
            target: edge.targetId,
            type: "smoothstep",
          })
        ),
      };
    },
    enabled: !!subjectId,
  });

  const renderView = () => {
    if (isLoadingSubject || isLoadingRoadmap) {
      return (
        <ViewWrapper>
          <Loading />
        </ViewWrapper>
      );
    }

    if (!subject) {
      return (
        <ViewWrapper>
          <div className="min-h-screen bg-[#0B0D11] text-white flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Subject not found</h2>
              <p className="text-gray-400">
                The subject you're looking for doesn't exist.
              </p>
            </div>
          </div>
        </ViewWrapper>
      );
    }

    if (roadmap && (roadmap.nodes.length > 0 || !isCalibrating)) {
      return (
        <ViewWrapper>
          <RoadmapView subject={subject} initialRoadmap={roadmap} />
        </ViewWrapper>
      );
    }

    return (
      <ViewWrapper>
        <CalibrationScreen
          subject={subject}
          onComplete={() => setIsCalibrating(false)}
        />
      </ViewWrapper>
    );
  };

  return (
    <div className="w-screen h-screen bg-background relative">
      <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
    </div>
  );
}
