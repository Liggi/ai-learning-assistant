import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { forwardRef, useImperativeHandle } from "react";
import type {
  MapNode,
  MapEdge,
  MapNodeData,
  QuestionNodeData,
  ArticleNodeData,
  NodeCreationOptions,
} from "./types";
import { useElkLayout } from "./use-elk-layout";
import { useLearningMapPlayground } from "./use-learning-map-playground";
import "@xyflow/react/dist/style.css";

export interface LearningMapHandle {
  runLayout: () => void;
  addNode: (options: NodeCreationOptions) => void;
  showHiddenNodes: () => void;
}

interface LearningMapProps {
  defaultNodes?: MapNode[];
  defaultEdges?: MapEdge[];
  nodeTypes: Record<string, React.ComponentType<NodeProps<MapNode>>>;
  onNodeClick?: (nodeId: string, data: MapNodeData) => void;
  onLayoutComplete?: (nodes: MapNode[], edges: MapEdge[]) => void;
  ref?: React.Ref<LearningMapHandle>;
  className?: string;
}

const LearningMapCore = forwardRef<
  LearningMapHandle,
  Omit<LearningMapProps, "className">
>(function LearningMapCore(
  {
    defaultNodes = [],
    defaultEdges = [],
    nodeTypes,
    onNodeClick,
    onLayoutComplete,
  },
  ref
) {
  const flow = useReactFlow();

  const runLayout = useElkLayout(flow, onLayoutComplete);
  const { addNode, showHiddenNodes } = useLearningMapPlayground(flow);

  useImperativeHandle(ref, () => ({ runLayout, addNode, showHiddenNodes }), [
    runLayout,
    addNode,
    showHiddenNodes,
  ]);

  const handleNodeClick = (_: React.MouseEvent, node: MapNode) => {
    if (onNodeClick) {
      onNodeClick(node.id, node.data);
    }
  };

  return (
    <ReactFlow
      defaultNodes={defaultNodes}
      defaultEdges={defaultEdges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      defaultEdgeOptions={{
        animated: false,
        style: {
          stroke: "#64748b",
          strokeWidth: 2,
        },
      }}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
    >
      <Background color="#f0f0f0" gap={24} size={1} />
    </ReactFlow>
  );
});

const LearningMapComponent = forwardRef<LearningMapHandle, LearningMapProps>(
  function LearningMap(props, ref) {
    return (
      <div className={props.className}>
        <ReactFlowProvider>
          <LearningMapCore {...props} ref={ref} />
        </ReactFlowProvider>
      </div>
    );
  }
);

export default LearningMapComponent;
