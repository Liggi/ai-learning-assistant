import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";

interface SubjectInputStepProps {
  userSubject: string;
  onSubjectChange: (subject: string) => void;
  onNext: () => void;
  isLoadingKnowledge: boolean;
}

export default function SubjectInputStep({
  userSubject,
  onSubjectChange,
  onNext,
  isLoadingKnowledge,
}: SubjectInputStepProps) {
  return (
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
        value={userSubject}
        onChange={(e) => onSubjectChange(e.target.value)}
        className="mb-4"
        onKeyDown={(e) => {
          if (e.key === "Enter" && userSubject.trim()) {
            onNext();
          }
        }}
      />
      {isLoadingKnowledge ? (
        <ButtonLoading className="w-full" />
      ) : (
        <Button
          className="w-full"
          onClick={onNext}
          disabled={!userSubject.trim()}
        >
          Next
        </Button>
      )}
    </motion.div>
  );
}
