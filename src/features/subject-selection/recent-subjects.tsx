import { motion } from "framer-motion";
import { SerializedSubject } from "@/types/serialized";
import { Link } from "@tanstack/react-router";

export default function RecentSubjects({
  subjects,
}: {
  subjects: SerializedSubject[];
}) {
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
                to="/learning/$subjectId"
                params={{ subjectId: subject.id }}
                className="text-sm w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors block"
                onClick={() => {
                  console.log("[RecentSubjects] Clicked on subject:", subject.title, "ID:", subject.id);
                }}
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
