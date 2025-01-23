import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import {
  generateRoadmap,
  generateKnowledgeNodes,
} from "@/features/roadmap/generator";
import Loading from "@/components/ui/loading";
import ChatScreen, { NodeData } from "@/components/chat-screen";
import SelectSubjectStep from "@/components/select-subject-step";
import KnowledgeNodesStep from "@/components/knowledge-nodes-step";

import "@xyflow/react/dist/style.css";
import FeynnmanTechnique from "@/components/feynmann-technique-step";

const nodeTypes = { normalNode: Node };

function FlowWithProvider({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: ReactFlowNode<NodeData>[];
  edges: ReactFlowEdge[];
  onNodeClick: (node: ReactFlowNode<NodeData>) => void;
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
      onNodeClick={(_, node) => onNodeClick(node)}
    ></ReactFlow>
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
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {}, [isLoading, showForm, step, nodes, selectedNode]);

  if (!isHydrated) {
    return <div className="w-screen h-screen bg-background" />;
  }

  async function handleSubmit() {
    setIsButtonLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(true);

    try {
      const roadmap = await generateRoadmap({
        data: {
          subject: userSubject,
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

  const handleNodeClick = (node: ReactFlowNode<NodeData>) => {
    setSelectedNode(node);
  };

  async function handleNextStep() {
    if (step === 1) {
      setIsLoadingKnowledge(true);
      try {
        const nodes = await generateKnowledgeNodes({
          data: {
            subject: userSubject,
          },
        });

        if (nodes.length === 0) {
          throw new Error("No knowledge nodes were generated");
        }

        setKnowledgeNodes(nodes);
        setStep(1.5);
      } catch (error) {
        console.error("Error generating knowledge nodes:", error);
      } finally {
        setIsLoadingKnowledge(false);
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

  return (
    <div style={{ width: "100vw", height: "100vh" }} className="bg-background">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Loading />
          </motion.div>
        ) : showForm ? (
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
                  <SelectSubjectStep
                    userSubject={userSubject}
                    onSubjectChange={(value: string) => setUserSubject(value)}
                    onNext={handleNextStep}
                    isLoadingKnowledge={isLoadingKnowledge}
                  />
                )}

                {step === 1.5 && (
                  <KnowledgeNodesStep
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
              </AnimatePresence>
            </motion.div>
          </div>
        ) : selectedNode ? (
          <ChatScreen
            node={selectedNode.data}
            onBack={() => setSelectedNode(null)}
            subject={userSubject}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <ReactFlowProvider>
              <FlowWithProvider
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
              />
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
              Create a new roadmap
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
