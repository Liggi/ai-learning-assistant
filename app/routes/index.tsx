import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import SubjectEntry from "@/features/subject-selection/subject-entry";
import { useRouter } from "@tanstack/react-router";
import { useSubjects } from "@/hooks/api/subjects";
import { Logger } from "@/lib/logger";
import RecentSubjects from "@/features/subject-selection/recent-subjects";
import { UserNav } from "@/components/user-nav";
import { getSession } from "@/lib/auth-client";
import { getWebRequest } from "@tanstack/react-start/server";

import "@xyflow/react/dist/style.css";

const logger = new Logger({ context: "HomeRoute" });

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const request = getWebRequest()!;
    const { data: session } = await getSession({
      fetchOptions: {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      },
    });
    console.log("Server-side route guard - session:", !!session)
    if (!session) {
      console.log("No server session found, redirecting to auth")
      throw redirect({ to: "/auth" })
    }
  },
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
