import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import SubjectEntry from "@/features/subject-selection/subject-entry";
import { useRouter } from "@tanstack/react-router";
import { useSubjects } from "@/hooks/api/subjects";
import { Logger } from "@/lib/logger";
import RecentSubjects from "@/features/subject-selection/recent-subjects";
import { UserNav } from "@/components/user-nav";

import "@xyflow/react/dist/style.css";

const logger = new Logger({ context: "HomeRoute" });

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const router = useRouter();

  const [userSubject, setUserSubject] = useState("");

  const { data: subjects = [] } = useSubjects();

  return (
    <div className="w-screen h-screen bg-background relative">
      <div className="absolute top-4 right-4 z-10">
        <UserNav />
      </div>
      <div className="absolute inset-0">
        <RecentSubjects subjects={subjects} />

        <SubjectEntry
          subject={userSubject}
          onSubjectChange={(newSubject) => {
            logger.info("Subject updated", { newSubject });
            setUserSubject(newSubject);
          }}
          onNext={(subjectId: string) => {
            logger.info("Moving to knowledge calibration", { subjectId });
            router.navigate({
              to: "/calibration/$subjectId",
              params: { subjectId },
            });
          }}
        />
      </div>
    </div>
  );
}
