import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";
import { generateRoadmap } from "@/features/roadmap/generator";
import Loading from "@/components/ui/loading";
import ChatScreen, { NodeData } from "@/components/chat-screen";
import SelectSubjectStep from "@/components/select-subject-step";
import KnowledgeNodesStep from "@/components/knowledge-nodes-step";
import FeynmanTechnique from "@/components/feynman-technique-step";
import RoadmapView from "@/components/roadmap-view";

import "@xyflow/react/dist/style.css";

console.log("[Debug] RoadmapView import:", {
  type: typeof RoadmapView,
  toString: RoadmapView.toString(),
});

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

  // Debug effect for roadmap data and view transitions
  useEffect(() => {
    if (currentView === "roadmap") {
      console.log("[Debug] Roadmap View State:", {
        hasNodes: nodes.length > 0,
        hasEdges: edges.length > 0,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });
    }
  }, [currentView, nodes, edges]);

  if (!isHydrated) {
    return <div className="w-screen h-screen bg-background" />;
  }

  async function handleSubmit() {
    setIsButtonLoading(true);
    setIsLoading(true);

    try {
      console.log("[Debug] Starting roadmap generation:", {
        subject: userSubject,
        knowledgeNodesCount: selectedKnowledgeNodes.size,
        timestamp: new Date().toISOString(),
      });

      const roadmap = await generateRoadmap({
        data: {
          subject: userSubject,
          priorKnowledge: Array.from(selectedKnowledgeNodes).join("\n\n"),
        },
      });

      console.log("[Debug] Received roadmap data:", {
        nodeCount: roadmap.nodes.length,
        edgeCount: roadmap.edges.length,
        nodes: roadmap.nodes.map((n) => ({
          id: n.id,
          position: n.position,
          type: n.type,
        })),
        edges: roadmap.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        timestamp: new Date().toISOString(),
      });

      setNodes(roadmap.nodes);
      setEdges(roadmap.edges);

      console.log("[Debug] State updated with roadmap data:", {
        timestamp: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("[Debug] Error in handleSubmit:", error);
    } finally {
      setIsLoading(false);
      setIsButtonLoading(false);
      console.log("[Debug] handleSubmit completed", {
        timestamp: new Date().toISOString(),
      });
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
    setSelectedKnowledgeNodes(new Set());
    setCurrentView("selectSubject");
  };

  const renderView = () => {
    console.log("[Debug] renderView function called", currentView);
    if (isLoading) {
      return (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Loading />
        </motion.div>
      );
    }

    console.log("[Debug] Rendering view:", {
      view: currentView,
      hasNodes: nodes.length > 0,
      hasEdges: edges.length > 0,
      timestamp: new Date().toISOString(),
    });

    switch (currentView) {
      case "selectSubject":
        return (
          <SelectSubjectStep
            subject={userSubject}
            onSubjectChange={setUserSubject}
            onNext={() => setCurrentView("calibrateWithExistingKnowledge")}
            isSubmitting={isLoadingKnowledge}
          />
        );

      case "calibrateWithExistingKnowledge":
        return (
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
        );

      case "feynmanTechnique":
        return (
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
        );

      case "roadmap":
        console.log("[Debug] Rendering roadmap view - BEFORE CHECKS:", {
          view: currentView,
          hasNodes: nodes.length > 0,
          hasEdges: edges.length > 0,
          nodes, // Log actual nodes structure
          edges, // Log actual edges structure
          timestamp: new Date().toISOString(),
        });

        if (!nodes.length || !edges.length) {
          console.log("[Debug] No nodes or edges available for roadmap");
          return null;
        }

        console.log("[Debug] About to return RoadmapView component");
        const roadmapComponent = (
          <RoadmapView
            nodes={nodes}
            edges={edges}
            onNodeClick={(node) => {
              setSelectedNode(node);
              setCurrentView("chat");
            }}
            onReset={handleReset}
          />
        );
        console.log("[Debug] RoadmapView component created:", roadmapComponent);
        return roadmapComponent;

      case "chat":
        return (
          <ChatScreen
            node={selectedNode?.data}
            subject={userSubject}
            onBack={() => setCurrentView("roadmap")}
          />
        );
    }
  };

  return (
    <div className="w-screen h-screen bg-background relative">
      {/* Remove AnimatePresence wrapper for roadmap view */}
      {currentView === "roadmap" ? (
        <div className="absolute inset-0">{renderView()}</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
