import { createFileRoute } from "@tanstack/react-router";
import { SubjectList } from "@/components/subject-list";

export const Route = createFileRoute("/subjects")({
  component: SubjectsPage,
});

function SubjectsPage() {
  return (
    <div className="container mx-auto py-8">
      <SubjectList />
    </div>
  );
}
