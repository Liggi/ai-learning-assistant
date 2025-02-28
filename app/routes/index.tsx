import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { generate as generateRoadmap } from "@/features/generators/roadmap";
import Loading from "@/components/ui/loading";
import SubjectEntry from "@/components/subject-entry";
import ExistingKnowledgeCalibration from "@/components/existing-knowledge-calibration";
import { Link, useRouter } from "@tanstack/react-router";
import {
  useSubjects,
  useCreateSubject,
  useSaveRoadmap,
  useSubjectWithRoadmap,
} from "@/hooks/api/subjects";
import { SerializedSubject } from "@/prisma/subjects";
import { Logger } from "@/lib/logger";

import "@xyflow/react/dist/style.css";

const logger = new Logger({ context: "HomeRoute" });

type ViewState = "selectSubject" | "calibrateWithExistingKnowledge";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>("selectSubject");
  const [userSubject, setUserSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set());
  const { data: subjects = [] } = useSubjects();
  const createSubjectMutation = useCreateSubject();
  const saveRoadmapMutation = useSaveRoadmap();
  const [loadingSubjectId] = useState<string | null>(null);
  const { data: loadedSubject } = useSubjectWithRoadmap(loadingSubjectId || "");

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (loadedSubject && loadedSubject.roadmap) {
      logger.info("Loaded existing subject", { title: loadedSubject.title });
      setUserSubject(loadedSubject.title);
    }
  }, [loadedSubject]);

  if (!isHydrated) {
    return <div className="w-screen h-screen bg-background" />;
  }

  async function handleSubmit() {
    logger.info("Starting subject creation", {
      subject: userSubject,
      knownTopicsCount: selectedKnowledgeNodes.size,
    });
    setIsLoading(true);

    try {
      const newSubject = await createSubjectMutation.mutateAsync(userSubject);
      logger.info("Subject created successfully", { subjectId: newSubject.id });

      await generateRoadmap({
        data: {
          subject: userSubject,
          priorKnowledge: Array.from(selectedKnowledgeNodes).join("\n\n"),
          subjectId: newSubject.id,
        },
      });
      logger.info("Roadmap generated successfully");

      logger.info("Navigating to learning map", { subjectId: newSubject.id });
      await router.navigate({
        to: "/learning-map/$subjectId",
        params: { subjectId: newSubject.id },
      });
    } catch (error) {
      logger.error("Error in handleSubmit", { error });
    } finally {
      setIsLoading(false);
    }
  }

  const toggleKnowledgeNode = (id: string) => {
    setSelectedKnowledgeNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        logger.debug("Knowledge node removed", { id });
      } else {
        newSet.add(id);
        logger.debug("Knowledge node added", { id });
      }
      return newSet;
    });
  };

  const renderView = () => {
    if (isLoading || loadingSubjectId) {
      return <Loading />;
    }

    switch (currentView) {
      case "selectSubject":
        return (
          <>
            <RecentSubjects subjects={subjects} />

            <SubjectEntry
              subject={userSubject}
              onSubjectChange={(newSubject) => {
                logger.info("Subject updated", { newSubject });
                setUserSubject(newSubject);
              }}
              onNext={() => {
                logger.info("Moving to knowledge calibration");
                setCurrentView("calibrateWithExistingKnowledge");
              }}
            />
          </>
        );

      case "calibrateWithExistingKnowledge":
        return (
          <ExistingKnowledgeCalibration
            subject={userSubject}
            selectedKnowledgeNodes={selectedKnowledgeNodes}
            onCalibrationChange={toggleKnowledgeNode}
            onBack={() => {
              logger.info("Returning to subject selection");
              setCurrentView("selectSubject");
            }}
            onNext={async () => {
              await handleSubmit();
            }}
          />
        );
    }
  };

  return (
    <div className="w-screen h-screen bg-background relative">
      <div className="absolute inset-0">{renderView()}</div>
    </div>
  );
}

function RecentSubjects({ subjects }: { subjects: SerializedSubject[] }) {
  return (
    <motion.div
      className="absolute top-4 left-4 z-50 bg-card rounded-lg shadow-lg p-4 w-64"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold mb-3">Recent Subjects</h3>
      {subjects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subjects yet</p>
      ) : (
        <ul className="space-y-2">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <Link
                to="/learning-map/$subjectId"
                params={{ subjectId: subject.id }}
                className="text-sm w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors block"
              >
                {subject.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
