import { useQuery } from "@tanstack/react-query";
import { getAllSubjects } from "@/features/db/subjects";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

export function SubjectList() {
  const navigate = useNavigate();
  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: getAllSubjects,
  });

  if (isLoading) {
    return <div>Loading subjects...</div>;
  }

  if (!subjects?.length) {
    return <div>No subjects found. Create your first one!</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Learning Subjects</h2>
      <div className="grid gap-4">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer"
            onClick={() =>
              navigate({
                to: "/workshop/subject/$subjectId",
                params: { subjectId: subject.id },
              })
            }
          >
            <h3 className="text-lg font-semibold">{subject.title}</h3>
            <p className="text-gray-600">{subject.description}</p>
            <div className="mt-2 text-sm text-gray-500">
              Last updated: {new Date(subject.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => navigate({ to: "/" })} className="mt-4">
        Create New Subject
      </Button>
    </div>
  );
}
