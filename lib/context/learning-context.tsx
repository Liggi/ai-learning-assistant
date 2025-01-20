import { createContext, useContext, ReactNode, useState } from "react";
import { ConceptItem } from "@/lib/types/types";

interface LearningContextType {
  subject: string | undefined;
  knowledgeNodes: ConceptItem[];
  setSubject: (subject: string) => void;
  setKnowledgeNodes: React.Dispatch<React.SetStateAction<ConceptItem[]>>;
}

const LearningContext = createContext<LearningContextType | undefined>(
  undefined
);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [subject, setSubject] = useState<string | undefined>(undefined);
  const [knowledgeNodes, setKnowledgeNodes] = useState<ConceptItem[]>([]);

  const value = {
    subject,
    knowledgeNodes,
    setSubject,
    setKnowledgeNodes,
  };

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearningContext() {
  const context = useContext(LearningContext);
  if (context === undefined) {
    throw new Error(
      "useLearningContext must be used within a LearningProvider"
    );
  }
  return context;
}
