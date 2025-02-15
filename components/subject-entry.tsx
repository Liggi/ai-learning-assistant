import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";

interface SubjectEntryProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

export default function SubjectEntry({
  subject,
  onSubjectChange,
  onNext,
  isSubmitting = false,
}: SubjectEntryProps) {
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
                onNext();
              }
            }}
          />
          {isSubmitting ? (
            <ButtonLoading className="w-full" />
          ) : (
            <Button
              className="w-full"
              onClick={onNext}
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
