import { ReactFlow, ReactFlowProvider, Background, useReactFlow, useNodesInitialized, type NodeProps } from "@xyflow/react";
import { useState, useEffect, useRef, useMemo } from "react";
import type { MapNode, MapEdge, MapNodeData } from "./types";
import { calculateElkLayout } from "@/services/layouts/elk";
import "@xyflow/react/dist/style.css";

interface LearningMapProps {
  nodes: MapNode[];
  edges: MapEdge[];
  nodeTypes: Record<string, React.ComponentType<NodeProps<MapNode>>>;
  onNodeClick?: (nodeId: string, data: MapNodeData) => void;
  onLayoutComplete?: (nodes: MapNode[], edges: MapEdge[]) => void;
  triggerLayout?: boolean;
  className?: string;
}

function LearningMapCore({ 
  nodes, 
  edges, 
  nodeTypes, 
  onNodeClick,
  onLayoutComplete,
  triggerLayout,
}: Omit<LearningMapProps, 'className'>) {
  const flow = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [internalNodes, setInternalNodes] = useState<MapNode[]>(nodes);
  const [internalEdges, setInternalEdges] = useState<MapEdge[]>(edges);
  
  const isLayouting = useRef(false);

  // Update internal state when props change
  useEffect(() => {
    setInternalNodes(nodes);
    setInternalEdges(edges);
  }, [nodes, edges]);

  // Check if all nodes are ready (have measured dimensions)
  const allNodesReady = useMemo(() => {
    return internalNodes.length > 0 && 
           internalNodes.every(node => node.measured?.width && node.measured?.height);
  }, [internalNodes]);

  // Run layout when manually triggered
  useEffect(() => {
    const runLayout = async () => {
      if (!triggerLayout || !nodesInitialized || !allNodesReady || isLayouting.current) {
        return;
      }

      console.log("Running ELK layout...", { nodeCount: internalNodes.length });
      
      // Capture current positions before layout
      const oldPositions = new Map(
        internalNodes.map(node => [node.id, { x: node.position.x, y: node.position.y }])
      );
      
      isLayouting.current = true;
      const result = await calculateElkLayout(internalNodes, internalEdges);
      isLayouting.current = false;

      if (result) {
        console.log("Layout complete, animating to new positions");
        
        // Animate from old positions to new positions
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          const easeProgress = progress * progress * (3 - 2 * progress);
          
          const animatedNodes = result.nodes.map(newNode => {
            const oldPos = oldPositions.get(newNode.id);
            if (!oldPos) return newNode;
            
            const x = oldPos.x + (newNode.position.x - oldPos.x) * easeProgress;
            const y = oldPos.y + (newNode.position.y - oldPos.y) * easeProgress;
            
            return { ...newNode, position: { x, y } };
          });
          
          setInternalNodes(animatedNodes as MapNode[]);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            if (onLayoutComplete) {
              onLayoutComplete(animatedNodes as MapNode[], internalEdges);
            }
          }
        };
        
        setInternalEdges(result.edges as MapEdge[]);
        animate();
      }
    };

    runLayout();
  }, [triggerLayout, nodesInitialized, allNodesReady]);

  const handleNodeClick = (_: React.MouseEvent, node: MapNode) => {
    if (onNodeClick) {
      onNodeClick(node.id, node.data);
    }
  };

  return (
    <ReactFlow
      nodes={internalNodes}
      edges={internalEdges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onNodesChange={(changes) => {
        const updatedNodes = internalNodes.map(node => {
          const change = changes.find(c => c.id === node.id);
          if (change && change.type === 'dimensions') {
            return { ...node, measured: change.dimensions };
          }
          return node;
        });
        setInternalNodes(updatedNodes);
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
}

export default function LearningMap(props: LearningMapProps) {
  return (
    <div className={props.className}>
      <ReactFlowProvider>
        <LearningMapCore {...props} />
      </ReactFlowProvider>
    </div>
  );
}