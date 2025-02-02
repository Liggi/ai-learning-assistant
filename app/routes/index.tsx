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
import { useRoadmapStore, RoadmapNodeData } from "@/features/roadmap/store";
import ConversationFlow from "@/components/conversation-flow";
import ChatLayout from "@/components/chat-layout";
import {
  generateRoadmapBadges,
  ModuleBadge,
} from "@/features/badges/generator";

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
  const { setNodes: setConversationNodes, setEdges: setConversationEdges } =
    useConversationStore();
  const { setNodes: setRoadmapNodes, setEdges: setRoadmapEdges } =
    useRoadmapStore();
  const [currentView, setCurrentView] = useState<ViewState>("selectSubject");
  const [isHydrated, setIsHydrated] = useState(false);
  const [userSubject, setUserSubject] = useState("");
  const [userKnowledge, setUserKnowledge] = useState("");
  const [nodes, setNodes] = useState<ReactFlowNode<RoadmapNodeData>[]>([]);
  const [edges, setEdges] = useState<ReactFlowEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKnowledgeNodes, setSelectedKnowledgeNodes] = useState<
    Set<string>
  >(new Set());
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [selectedNode, setSelectedNode] =
    useState<ReactFlowNode<RoadmapNodeData> | null>(null);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [roadmapBadges, setRoadmapBadges] = useState<ModuleBadge[]>([]);

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

      // Update local state
      setNodes(roadmap.nodes);
      setEdges(roadmap.edges);

      // Sync with stores
      setRoadmapNodes(roadmap.nodes);
      setRoadmapEdges(roadmap.edges);

      // Generate badges for the entire roadmap
      try {
        const badges = await generateRoadmapBadges({
          data: {
            subject: userSubject,
            nodes: roadmap.nodes,
            selectedKnowledgeNodes: Array.from(selectedKnowledgeNodes),
          },
        });
        console.log("Generated badges for learning journey:");
        console.log(badges);
        setRoadmapBadges(badges);
      } catch (error) {
        console.error("Error generating badges:", error);
      }

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

  const handleNodeClick = (node: ReactFlowNode<RoadmapNodeData>) => {
    setSelectedNode(node);
    setCurrentView("chat");

    // Log out badges for this module using our dynamically generated badges
    const moduleBadges = roadmapBadges.filter(
      (badge) => badge.moduleId === node.id
    );
    console.log("Available badges for module:", node.data.label);
    console.log(moduleBadges);
  };

  const handleReset = () => {
    setUserSubject("");
    setUserKnowledge("");
    setNodes([]);
    setEdges([]);
    setRoadmapBadges([]);
    // Clear conversation store state
    setConversationNodes([]);
    setConversationEdges([]);
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
            <ChatLayout
              node={selectedNode?.data}
              subject={userSubject}
              onBack={() => setCurrentView("roadmap")}
              onShowRoadmap={() => {
                console.log("Setting view to roadmap");
                setCurrentView("roadmap");
                console.log("New view state:", "roadmap");
              }}
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
