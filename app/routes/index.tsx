import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
import { generateRoadmap } from "@/features/roadmap/generator";
import Loading from "@/components/ui/loading";
import ChatInterface, { NodeData } from "@/components/chat-interface";
import SelectSubjectStep from "@/components/select-subject-step";
import KnowledgeNodesStep from "@/components/knowledge-nodes-step";
import FeynmanTechnique from "@/components/feynman-technique-step";
import RoadmapView from "@/components/roadmap-view";
import { useConversationStore } from "@/features/chat/store";

import "@xyflow/react/dist/style.css";

type ViewState =
  | "selectSubject"
  | "calibrateWithExistingKnowledge"
  | "feynmanTechnique"
  | "roadmap"
  | "chat";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { setNodes: setStoreNodes, setEdges: setStoreEdges } =
    useConversationStore();
  const [currentView, setCurrentView] = useState<ViewState>("selectSubject");
  const [isHydrated, setIsHydrated] = useState(false);
  const [userSubject, setUserSubject] = useState("");
  const [userKnowledge, setUserKnowledge] = useState("");
  const [nodes, setNodes] = useState<ReactFlowNode<NodeData>[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set());
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [selectedNode, setSelectedNode] =
    useState<ReactFlowNode<NodeData> | null>(null);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <div className="w-screen h-screen bg-background" />;
  }

  async function handleSubmit() {
    setIsButtonLoading(true);
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

      // Sync with conversation store
      setStoreNodes(roadmap.nodes);
      setStoreEdges(roadmap.edges);

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("[Debug] Error in handleSubmit:", error);
    } finally {
      setIsLoading(false);
      setIsButtonLoading(false);
    }
  }

  const toggleKnowledgeNode = (id: string) => {
    setSelectedKnowledgeNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleNodeClick = (node: ReactFlowNode<NodeData>) => {
    setSelectedNode(node);
    setCurrentView("chat");
  };

  const handleReset = () => {
    setUserSubject("");
    setUserKnowledge("");
    setNodes([]);
    setEdges([]);
    // Clear conversation store state
    setStoreNodes([]);
    setStoreEdges([]);
    setSelectedKnowledgeNodes(new Set());
    setCurrentView("selectSubject");
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <ViewWrapper>
          <Loading />
        </ViewWrapper>
      );
    }

    switch (currentView) {
      case "selectSubject":
        return (
          <ViewWrapper>
            <SelectSubjectStep
              subject={userSubject}
              onSubjectChange={setUserSubject}
              onNext={() => setCurrentView("calibrateWithExistingKnowledge")}
              isSubmitting={isLoadingKnowledge}
            />
          </ViewWrapper>
        );

      case "calibrateWithExistingKnowledge":
        return (
          <ViewWrapper>
            <KnowledgeNodesStep
              subject={userSubject}
              selectedKnowledgeNodes={selectedKnowledgeNodes}
              onCalibrationChange={toggleKnowledgeNode}
              onBack={() => setCurrentView("selectSubject")}
              onNext={async () => {
                await handleSubmit();
                setCurrentView("roadmap");
              }}
            />
          </ViewWrapper>
        );

      case "feynmanTechnique":
        return (
          <ViewWrapper>
            <FeynmanTechnique
              userKnowledge={userKnowledge}
              setUserKnowledge={setUserKnowledge}
              setStep={(step) => {
                if (step === 1) {
                  setCurrentView("calibrateWithExistingKnowledge");
                }
              }}
              isLoading={isLoading}
              isButtonLoading={isButtonLoading}
              handleSubmit={async () => {
                await handleSubmit();
                setCurrentView("roadmap");
              }}
            />
          </ViewWrapper>
        );

      case "roadmap":
        if (!nodes.length || !edges.length) {
          return null;
        }

        return (
          <ViewWrapper>
            <RoadmapView
              nodes={nodes}
              edges={edges}
              onNodeClick={(node) => {
                setSelectedNode(node);
                setCurrentView("chat");
              }}
              onReset={handleReset}
            />
          </ViewWrapper>
        );

      case "chat":
        return (
          <ViewWrapper>
            <ChatInterface
              node={selectedNode?.data}
              subject={userSubject}
              onBack={() => setCurrentView("roadmap")}
            />
          </ViewWrapper>
        );
    }
  };

  return (
    <div className="w-screen h-screen bg-background relative">
      {currentView === "roadmap" ? (
        <div className="absolute inset-0">{renderView()}</div>
      ) : (
        <AnimatePresence mode="wait">{renderView()}</AnimatePresence>
      )}
    </div>
  );
}

function ViewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
