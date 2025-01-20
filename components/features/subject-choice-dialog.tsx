import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";
import { useLearningContext } from "@/lib/context/learning-context";

export default function SubjectChoiceDialog({
  onConfirm,
}: {
  onConfirm: () => void;
}) {
  const { setSubject } = useLearningContext();

  const [userSubject, setUserSubject] = useState("");
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  const handleConfirm = () => {
    setIsLoadingKnowledge(true);
    if (!userSubject.trim()) {
      return;
    }

    setSubject(userSubject);
    onConfirm();
  };

  return (
    <motion.div
      key={location.pathname}
      style={{ minWidth: 400, minHeight: 300 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
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
          value={userSubject}
          onChange={(e) => setUserSubject(e.target.value)}
          className="mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && userSubject.trim()) {
              handleConfirm();
            }
          }}
        />

        {isLoadingKnowledge ? (
          <ButtonLoading className="w-full" />
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              handleConfirm();
            }}
            disabled={!userSubject.trim()}
          >
            Next
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
