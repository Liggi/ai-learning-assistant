import React, { useState, useEffect } from "react";
import ConversationFlow from "./conversation-flow";
import ChatInterface, { NodeData } from "./chat-interface";
import { useConversationStore } from "@/features/chat/store";
import { useRoadmapStore, RoadmapNodeData } from "@/features/roadmap/store";
import RoadmapView from "@/components/roadmap-view";
import { Node } from "@xyflow/react";
import { LayoutGrid, GitBranch } from "lucide-react";
import {
  generateCurriculumLearningPath,
  generateModuleLearningPath,
  generateCurriculumAchievements,
  generateModuleAchievements,
} from "../features/badges";

interface ChatLayoutProps {
  node?: Node<RoadmapNodeData>;
  onBack: () => void;
  subject: string;
  selectedMessageId?: string;
  onShowRoadmap?: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  node,
  subject,
  onBack,
  selectedMessageId: selectedMessageIdProp,
  onShowRoadmap,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<
    string | undefined
  >(selectedMessageIdProp);
  const [currentView, setCurrentView] = useState<"conversation" | "roadmap">(
    "conversation"
  );

  // Get conversation data
  const {
    messages: conversation,
    nodes: conversationNodes,
    edges: conversationEdges,
    setActiveNode,
  } = useConversationStore((state) => ({
    messages: state.messages,
    nodes: state.nodes,
    edges: state.edges,
    setActiveNode: state.setActiveNode,
  }));

  // Get roadmap data
  const { nodes: roadmapNodes, edges: roadmapEdges } = useRoadmapStore(
    (state) => ({
      nodes: state.nodes,
      edges: state.edges,
    })
  );

  // Convert RoadmapNode to ChatInterface NodeData
  const chatNode =
    node && node.data
      ? {
          label: node.data.label,
          description: node.data.description,
          status: node.data.status,
          progress: node.data.progress,
        }
      : undefined;

  // Generate badges when module changes
  useEffect(() => {
    const generateBadges = async () => {
      console.log("\n🔍 Starting badge generation with:", {
        subject,
        nodeId: node?.id,
        nodeData: node?.data,
        roadmapNodesCount: roadmapNodes?.length,
      });

      // Only generate badges if we have both subject and roadmap nodes
      if (!subject || !roadmapNodes?.length) {
        console.log("❌ Missing required data for badge generation:", {
          subject,
          roadmapNodesCount: roadmapNodes?.length,
        });
        return;
      }

      try {
        // Cache the node data to prevent unnecessary re-renders
        const nodeData = roadmapNodes.map((node) => ({
          id: node.id,
          data: {
            label: node.data.label,
            description: node.data.description,
          },
        }));

        console.log("📦 Prepared node data:", nodeData);

        // 1. Generate Curriculum Learning Path Badges
        console.log(
          "\n🎯 Attempting to generate Curriculum Learning Path Badges..."
        );
        try {
          await generateCurriculumLearningPath({
            data: {
              subject,
              subjectArea: subject,
              nodes: nodeData,
            },
          });
          console.log(
            "✅ Successfully generated curriculum learning path badges"
          );
        } catch (error) {
          console.error(
            "❌ Failed to generate curriculum learning path badges:",
            error
          );
          throw error;
        }

        // 2. Generate Curriculum Achievement Badges
        console.log(
          "\n🏆 Attempting to generate Curriculum Achievement Badges..."
        );
        const completedNodes = roadmapNodes.filter(
          (n) => n.data.status === "completed"
        );
        console.log("📊 Completed nodes:", {
          count: completedNodes.length,
          nodes: completedNodes.map((n) => n.id),
        });

        try {
          await generateCurriculumAchievements({
            data: {
              subject,
              subjectArea: subject,
              nodes: nodeData,
              completedModules: completedNodes.map((n) => n.id),
              overallProgress: completedNodes.length / roadmapNodes.length,
            },
          });
          console.log(
            "✅ Successfully generated curriculum achievement badges"
          );
        } catch (error) {
          console.error(
            "❌ Failed to generate curriculum achievement badges:",
            error
          );
          throw error;
        }

        // If we have a selected module, generate module-specific badges
        if (node?.id && node.data) {
          console.log("\n📌 Selected node details:", {
            id: node.id,
            label: node.data.label,
            description: node.data.description,
            progress: node.data.progress,
          });

          // 3. Generate Module Learning Path Badges
          console.log(
            "\n🎯 Attempting to generate Module Learning Path Badges..."
          );
          try {
            await generateModuleLearningPath({
              data: {
                moduleId: node.id,
                moduleLabel: node.data.label,
                moduleDescription: node.data.description,
                concepts: [], // TODO: Get concepts from module data
              },
            });
            console.log(
              "✅ Successfully generated module learning path badges"
            );
          } catch (error) {
            console.error(
              "❌ Failed to generate module learning path badges:",
              error
            );
            throw error;
          }

          // 4. Generate Module Achievement Badges
          console.log(
            "\n🏆 Attempting to generate Module Achievement Badges..."
          );
          try {
            await generateModuleAchievements({
              data: {
                subject,
                moduleId: node.id,
                moduleLabel: node.data.label,
                moduleDescription: node.data.description,
                concepts: [], // TODO: Get concepts from module data
                progress: node.data.progress || 0,
              },
            });
            console.log("✅ Successfully generated module achievement badges");
          } catch (error) {
            console.error(
              "❌ Failed to generate module achievement badges:",
              error
            );
            throw error;
          }
        }
      } catch (error) {
        console.error("\n💥 Badge generation failed with error:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
          });
        }
      }
    };

    // Debounce the badge generation to prevent rapid re-renders
    const timeoutId = setTimeout(() => {
      generateBadges();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [subject, node?.id, node?.data]); // Only re-run when subject or selected node changes

  // Hook up the conversation flow callback so that clicking a node updates
  // the selected message
  const handleNodeClick = (text: string, nodeId: string) => {
    // Find the clicked message
    const messageIndex = conversation.findIndex((msg) => msg.id === nodeId);
    if (messageIndex === -1) return;

    const message = conversation[messageIndex];

    // If this is a user message (question) and there's a next message, select the answer instead
    if (message.isUser && messageIndex + 1 < conversation.length) {
      const answer = conversation[messageIndex + 1];
      if (answer.id) {
        setSelectedMessageId(answer.id);
        setActiveNode(answer.id);
      }
    } else if (message.id) {
      setSelectedMessageId(message.id);
      setActiveNode(message.id);
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      {/* Left: Conversation Flow or Roadmap Visualization */}
      <div className="w-1/2 h-full border-r border-slate-700 relative">
        {/* View Toggle Button */}
        <button
          onClick={() =>
            setCurrentView(
              currentView === "conversation" ? "roadmap" : "conversation"
            )
          }
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md
                   text-xs font-medium transition-all duration-150
                   bg-slate-800/50 border border-slate-700/50
                   hover:bg-slate-800 hover:border-slate-700"
        >
          {currentView === "conversation" ? (
            <>
              <LayoutGrid size={12} className="text-slate-400" />
              <span className="text-slate-300">Learning Plan</span>
            </>
          ) : (
            <>
              <GitBranch size={12} className="text-slate-400" />
              <span className="text-slate-300">Conversation Map</span>
            </>
          )}
        </button>

        {currentView === "conversation" ? (
          <ConversationFlow
            conversation={conversation}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedMessageId || selectedMessageIdProp}
          />
        ) : (
          <RoadmapView
            nodes={roadmapNodes}
            edges={roadmapEdges}
            onNodeClick={(node: Node<RoadmapNodeData>) => {
              // If we have a parent onShowRoadmap, use that for full-screen mode
              if (onShowRoadmap) {
                onShowRoadmap();
              } else {
                // Otherwise, switch back to conversation view with the selected node
                setCurrentView("conversation");
                handleNodeClick(node.data.label, node.id);
              }
            }}
            onReset={() => setCurrentView("conversation")}
            isPanel={true}
          />
        )}
      </div>
      {/* Right: Chat Interface */}
      <div className="w-1/2 h-full">
        <ChatInterface
          node={chatNode}
          subject={subject}
          onBack={onBack}
          selectedMessageId={selectedMessageId || selectedMessageIdProp}
          onNewMessage={(messageId) => setSelectedMessageId(messageId)}
        />
      </div>
    </div>
  );
};

export default ChatLayout;
