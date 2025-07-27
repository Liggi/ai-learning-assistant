import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";
import { useCreateSubject } from "@/hooks/api/subjects";

interface SubjectEntryProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  onNext: (subjectId: string) => void;
}

export default function SubjectEntry({
  subject,
  onSubjectChange,
  onNext,
}: SubjectEntryProps) {
  const createSubjectMutation = useCreateSubject();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const newSubject = await createSubjectMutation.mutateAsync(subject);
    setIsSubmitting(false);

    onNext(newSubject.id);
  };

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <motion.div
        style={{ minWidth: 400, minHeight: 300 }}
        className="bg-card rounded-lg shadow-lg p-8 overflow-hidden relative"
      >
        <motion.div
          key="step1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-center">
            What do you want to learn about?
          </h2>
          <Input
            placeholder="e.g. React"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="mb-4"
            onKeyDown={(e) => {
              if (e.key === "Enter" && subject.trim()) {
                handleSubmit();
              }
            }}
          />
          {isSubmitting ? (
            <ButtonLoading className="w-full" />
          ) : (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!subject.trim()}
            >
              Next
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
