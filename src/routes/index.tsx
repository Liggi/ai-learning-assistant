import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserNav } from "@/components/user-nav";
import RecentSubjects from "@/features/subject-selection/recent-subjects";
import SubjectEntry from "@/features/subject-selection/subject-entry";
import { useSubjects } from "@/hooks/api/subjects";
import { useSession } from "@/lib/auth-client";
import { Logger } from "@/lib/logger";

import "@xyflow/react/dist/style.css";

const logger = new Logger({ context: "HomeRoute", enabled: false });

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const router = useRouter();
  const navigate = useNavigate();
  const { data: session, isPending, isRefetching } = useSession();
  const loading = isPending || isRefetching;

  const [userSubject, setUserSubject] = useState("");
  const { data: subjects = [] } = useSubjects();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  // Show loading while checking session
  if (loading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render if no session (will redirect)
  if (!session) {
    return null;
  }

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
