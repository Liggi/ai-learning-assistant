import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  Background,
  useNodesInitialized,
  useNodesState,
  useEdgesState,
  Edge,
  useReactFlow,
} from "@xyflow/react";
import ConversationNode from "./react-flow/conversation-node";
import QuestionNode from "./react-flow/question-node";
import { SerializedLearningMap } from "@/types/serialized";
import {
  LearningMapFlowNode,
  useLearningMapElkLayout,
  useLearningMapFlowLayout,
} from "@/hooks/use-react-flow-layout";
import { calculateElkLayout } from "@/services/layouts/elk";
import { Logger } from "@/lib/logger";

interface PersonalLearningMapFlowProps {
  onNodeClick?: (nodeId: string) => void;
  learningMap?: SerializedLearningMap | null;
}

const nodeTypes = {
  conversationNode: ConversationNode,
  questionNode: QuestionNode,
};

const emptyFlowState: ReturnType<typeof useLearningMapElkLayout> = {
  nodes: [],
  edges: [],
  isLayouting: false,
  hasLayouted: false,
  error: null,
};

const logger = new Logger({
  context: "PersonalLearningMapFlow",
  enabled: true,
});

const PersonalLearningMapFlow: React.FC<PersonalLearningMapFlowProps> = ({
  onNodeClick,
  learningMap,
}) => {
  const flow = useReactFlow();

  const { nodes, edges } = learningMap
    ? useLearningMapFlowLayout(learningMap)
    : emptyFlowState;

  const [flowNodes, setFlowNodes, onFlowNodesChange] =
    useNodesState<LearningMapFlowNode>(nodes);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] =
    useEdgesState<Edge>(edges);
  const nodesInitialized = useNodesInitialized();
  const [isFlowVisible, setIsFlowVisible] = useState(false);

  const isLayouting = useRef(false);
  const hasLayouted = useRef(false);
  const allNodesReady = useMemo(
    () =>
      flowNodes.length > 0 &&
      flowNodes
        .filter((n) => n.type === "conversationNode")
        .every((node) => node.data.ready === true),
    [flowNodes]
  );

  useEffect(() => {
    const runLayout = async () => {
      if (!nodesInitialized || hasLayouted.current || !allNodesReady) {
        return;
      }

      if (isLayouting.current) {
        return;
      }

      logger.info("Calculating ELK layout for nodes", { flowNodes });

      isLayouting.current = true;
      const result = await calculateElkLayout(flowNodes, flowEdges);
      isLayouting.current = false;

      if (!result) {
        return;
      }

      setFlowNodes(result.nodes);
      setFlowEdges(result.edges);

      hasLayouted.current = true;
      isLayouting.current = false;

      setTimeout(() => {
        setIsFlowVisible(true);
        flow.fitView();
      }, 0);
    };

    runLayout();
  }, [flowNodes, flowEdges, nodesInitialized, allNodesReady]);

  const defaultEdgeOptions = {
    type: "smoothstep" as const,
    animated: true,
  };

  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  return (
    <div
      className={`w-full h-full transition-opacity duration-300 ease-in-out ${
        isFlowVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={(changes) => {
          const isStructuralChange = changes.some(
            (change) => change.type === "add" || change.type === "remove"
          );
          if (isStructuralChange) {
            hasLayouted.current = false;
            setIsFlowVisible(false);
          }
          onFlowNodesChange(changes);
        }}
        onEdgesChange={onFlowEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={defaultEdgeOptions}
      >
        <Background color="#f0f0f0" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
};

export default React.memo(PersonalLearningMapFlow);
