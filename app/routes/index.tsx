import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
=======
import { ButtonLoading } from "@/components/ui/button-loading";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
>>>>>>> 1dbd97d (WIP refactor)
import {
  generateRoadmap,
  generateKnowledgeNodes,
} from "@/resources/roadmap/generator";
import Loading from "@/components/ui/loading";
import ChatScreen, { NodeData } from "@/components/chat-screen";
<<<<<<< HEAD
import SelectSubjectStep from "@/components/select-subject-step";
import KnowledgeNodesStep from "@/components/knowledge-nodes-step";
=======
import { BookOpen } from "lucide-react";
import Calibration from "@/components/features/calibration";
import LearningRoadmap from "@/components/features/learning-roadmap";
import SubjectChoiceDialog from "@/components/features/subject-choice-dialog";
import { useLearningContext } from "@/lib/context/learning-context";
>>>>>>> 1dbd97d (WIP refactor)

import "@xyflow/react/dist/style.css";
import FeynnmanTechnique from "@/components/feynmann-technique-step";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { subject, setSubject } = useLearningContext();

  const [isHydrated, setIsHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [userKnowledge, setUserKnowledge] = useState("");
  const [nodes, setNodes] = useState<ReactFlowNode<NodeData>[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [selectedNode, setSelectedNode] =
    useState<ReactFlowNode<NodeData> | null>(null);
  const [knowledgeNodes, setKnowledgeNodes] = useState<Array<string>>([]);
  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    setIsHydrated(true);
  }, []);

<<<<<<< HEAD
  useEffect(() => {}, [isLoading, showForm, step, nodes, selectedNode]);

=======
>>>>>>> 1dbd97d (WIP refactor)
  if (!isHydrated) {
    return <div className="w-screen h-screen bg-background" />;
  }

  async function handleSubmit() {
<<<<<<< HEAD
    setIsButtonLoading(true);

=======
    if (!subject) {
      throw new Error("Subject is not set");
    }

    setIsButtonLoading(true);

    // Just to make the button loading state look better
>>>>>>> 1dbd97d (WIP refactor)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(true);

    try {
      const roadmap = await generateRoadmap({
        data: {
          subject,
          priorKnowledge: Array.from(selectedKnowledgeNodes).join("\n\n"),
        },
      });

      setNodes(roadmap.nodes);
      setEdges(roadmap.edges);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setShowForm(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    } finally {
      setIsLoading(false);
      setIsButtonLoading(false);
    }
  }

<<<<<<< HEAD
  const handleNodeClick = (node: ReactFlowNode<NodeData>) => {
    setSelectedNode(node);
  };

=======
>>>>>>> 1dbd97d (WIP refactor)
  async function handleNextStep() {
    if (!subject) {
      throw new Error("Subject is not set");
    }

    if (step === 1) {
      try {
        const nodes = await generateKnowledgeNodes({
          data: {
            subject,
          },
        });

        if (nodes.length === 0) {
          throw new Error("No knowledge nodes were generated");
        }

        setKnowledgeNodes(nodes);
        setStep(1.5);
      } catch (error) {
        console.error("Error generating knowledge nodes:", error);
<<<<<<< HEAD
      } finally {
        setIsLoadingKnowledge(false);
=======
        // Stay on step 1 and show an error state
>>>>>>> 1dbd97d (WIP refactor)
      }
    }
  }

  function toggleKnowledgeNode(id: string) {
    setSelectedKnowledgeNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  if (isLoading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Loading />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }} className="bg-background">
      <AnimatePresence mode="wait">
        {showForm ? (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              style={{ minWidth: 400, minHeight: 300 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-lg shadow-lg p-8 overflow-hidden relative"
            >
              <AnimatePresence mode="wait">
                {step === 1 && (
<<<<<<< HEAD
                  <SelectSubjectStep
                    userSubject={userSubject}
                    onSubjectChange={(value: string) => setUserSubject(value)}
                    onNext={handleNextStep}
                    isLoadingKnowledge={isLoadingKnowledge}
                  />
=======
                  <SubjectChoiceDialog onConfirm={handleNextStep} />
>>>>>>> 1dbd97d (WIP refactor)
                )}

                {step === 1.5 && (
                  <Calibration
                    knowledgeNodes={knowledgeNodes}
                    selectedKnowledgeNodes={selectedKnowledgeNodes}
                    onToggleNode={toggleKnowledgeNode}
                    onBack={() => {
                      setStep(1);
                      setKnowledgeNodes([]);
                      setSelectedKnowledgeNodes(new Set());
                    }}
                    onNext={handleSubmit}
                  />
                )}
<<<<<<< HEAD

                {step === 2 && (
                  <FeynnmanTechnique
                    userKnowledge={userKnowledge}
                    setUserKnowledge={setUserKnowledge}
                    setStep={setStep}
                    isLoading={isLoading}
                    isButtonLoading={isButtonLoading}
                    handleSubmit={handleSubmit}
                  />
                )}
=======
>>>>>>> 1dbd97d (WIP refactor)
              </AnimatePresence>
            </motion.div>
          </div>
        ) : selectedNode ? (
          <ChatScreen
            node={selectedNode.data}
            onBack={() => setSelectedNode(null)}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <LearningRoadmap roadmap={{ nodes, edges }} />
            <Button
              variant="outline"
              className="absolute top-4 left-4"
              onClick={() => {
                setShowForm(true);
                setStep(1);
                setUserKnowledge("");
              }}
            >
              Create a new roadmap
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
