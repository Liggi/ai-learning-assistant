import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { generateRoadmap } from "@/features/roadmap/generator";
import { Loading } from "@/components/ui/loading";

import "@xyflow/react/dist/style.css";

const nodeTypes = { normalNode: Node };

const stepVariants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
    },
  },
};

const containerVariants = {
  small: {
    width: "400px",
    height: "auto",
    transition: {
      duration: 0.3,
      type: "spring",
      stiffness: 100,
    },
  },
  large: {
    width: "600px",
    height: "auto",
    transition: {
      duration: 0.3,
      type: "spring",
      stiffness: 100,
    },
  },
};

function FlowWithProvider({
  nodes,
  edges,
}: {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [step, setStep] = useState(1);
  const [userSubject, setUserSubject] = useState("");
  const [userKnowledge, setUserKnowledge] = useState("");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <Loading />;
  }

  async function handleSubmit() {
    setIsLoading(true);
    const roadmap = await generateRoadmap({
      data: {
        subject: userSubject,
        priorKnowledge: userKnowledge,
      },
    });

    console.log(roadmap);

    setNodes(roadmap.nodes);
    setEdges(roadmap.edges);
    setIsLoading(false);
    setShowForm(false);
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }} className="bg-background">
      <AnimatePresence mode="wait">
        {showForm ? (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              variants={containerVariants}
              initial="small"
              animate={step === 1 ? "small" : "large"}
              className="bg-card rounded-lg shadow-lg p-8"
            >
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <h2 className="text-2xl font-bold mb-6 text-center">
                      What do you want to learn about?
                    </h2>
                    <Input
                      placeholder="e.g. React"
                      value={userSubject}
                      onChange={(e) => setUserSubject(e.target.value)}
                      className="mb-4"
                    />
                    <Button
                      className="w-full"
                      onClick={() => setStep(2)}
                      disabled={!userSubject.trim()}
                    >
                      Next
                    </Button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <h2 className="text-2xl font-bold mb-6 text-center">
                      Explain what you already know
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Using the Feynman Technique, write out everything you
                      already know about this topic as if you're explaining it
                      to someone else. This helps identify knowledge gaps and
                      creates a better learning path.
                    </p>
                    <textarea
                      className="w-full min-h-[150px] p-3 rounded-md border mb-4 bg-background"
                      value={userKnowledge}
                      onChange={(e) => setUserKnowledge(e.target.value)}
                      placeholder="Start explaining what you know..."
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      {isLoading ? (
                        <ButtonLoading className="flex-1" />
                      ) : (
                        <Button
                          onClick={handleSubmit}
                          className="flex-1"
                          disabled={!userKnowledge.trim()}
                        >
                          Generate Roadmap
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <ReactFlowProvider>
              <FlowWithProvider nodes={nodes} edges={edges} />
            </ReactFlowProvider>
            <Button
              variant="outline"
              className="absolute top-4 left-4"
              onClick={() => {
                setShowForm(true);
                setStep(1);
                setUserSubject("");
                setUserKnowledge("");
              }}
            >
              Create New Roadmap
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
