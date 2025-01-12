import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoading } from "@/components/ui/button-loading";
import {
  ReactFlow,
  ReactFlowProvider,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import Node from "@/components/react-flow/node";
import { generateRoadmap } from "@/features/roadmap/generator";
import Loading from "@/components/ui/loading";
import ChatScreen, { NodeData } from "@/components/chat-screen";
import { BookOpen } from "lucide-react";

import "@xyflow/react/dist/style.css";

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

  useEffect(() => {
    console.log("Component mounted");
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    console.log("State changed:", {
      isLoading,
      showForm,
      step,
      hasNodes: nodes.length > 0,
      hasSelectedNode: selectedNode !== null,
    });
  }, [isLoading, showForm, step, nodes, selectedNode]);

  if (!isHydrated) {
    console.log("Not hydrated yet");
    return <div className="w-screen h-screen bg-background" />;
  }

  async function handleSubmit() {
    console.log("handleSubmit started");
    setIsButtonLoading(true);

    // Show button loading state first
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Then transition to full loading screen
    setIsLoading(true);

    try {
      console.log("Calling generateRoadmap");
      const roadmap = await generateRoadmap({
        data: {
          subject: userSubject,
          priorKnowledge: userKnowledge,
        },
      });
      console.log("Roadmap generated:", { nodeCount: roadmap.nodes.length });

      setNodes(roadmap.nodes);
      setEdges(roadmap.edges);

      // Add a delay before transitioning out
      await new Promise((resolve) => setTimeout(resolve, 500));
      setShowForm(false);
      setIsLoading(false);
      setIsButtonLoading(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setIsLoading(false);
      setIsButtonLoading(false);
    }
  }

  const handleNodeClick = (node: ReactFlowNode<NodeData>) => {
    console.log("Node clicked:", node.id);
    setSelectedNode(node);
  };

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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-2xl mx-auto"
                  >
                    <h2 className="text-2xl font-semibold text-white mb-4 text-center">
                      Explain what you already know
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                      Write out everything you already know about this topic as
                      if you're explaining it to someone else. This helps
                      identify knowledge gaps and creates a better learning
                      path.
                    </p>
                    <div className="relative mb-4">
                      <textarea
                        className="w-full min-h-[200px] p-4 rounded-lg border border-gray-600 bg-[#0D1117] text-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)] placeholder:text-gray-500 transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] focus:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                        value={userKnowledge}
                        onChange={(e) => setUserKnowledge(e.target.value)}
                        placeholder="What do you already know about this?"
                      />
                      <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-50"></div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 h-11 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-200 transition-colors duration-300"
                        disabled={isLoading}
                      >
                        Back
                      </Button>
                      {isButtonLoading ? (
                        <ButtonLoading className="flex-1 h-11 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(129,140,248,0.5)] relative overflow-hidden group" />
                      ) : (
                        <Button
                          onClick={handleSubmit}
                          disabled={!userKnowledge.trim() || isButtonLoading}
                          className="flex-1 h-11 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(129,140,248,0.5)] relative overflow-hidden group"
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-60 transition-opacity duration-300 ease-in-out"></span>
                          <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-300 ease-in-out"></span>
                          <BookOpen className="w-5 h-5 relative z-10" />
                          <span className="relative z-10">
                            Generate a roadmap
                          </span>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
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
