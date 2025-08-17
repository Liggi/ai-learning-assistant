import type { ReactFlowInstance } from "@xyflow/react";
import { useCallback, useRef } from "react";
import { Logger } from "@/lib/logger";
import type { SerializedLearningMap } from "@/types/serialized";
import type { MapEdge, MapNode, NodeCreationOptions, NodeReplacementOptions } from "./types";
import { useElkLayout } from "./use-elk-layout";

const logger = new Logger({ context: "MapCore", enabled: false });

function findSourceNodeId(node: MapNode, learningMap: SerializedLearningMap): string | undefined {
  if (node.type === "questionNode") {
    const question = learningMap.questions?.find((q) => q.id === node.id);
    return question?.parentArticleId;
  }

  if (node.type === "articleNode") {
    // Find the question that has this article as its childArticleId
    const parentQuestion = learningMap.questions?.find((q) => q.childArticleId === node.id);
    return parentQuestion?.id;
  }

  return undefined;
}

const sortNodesByDependencies = (
  nodes: MapNode[],
  learningMap: SerializedLearningMap
): MapNode[] => {
  const sorted: MapNode[] = [];
  const remaining = [...nodes];

  while (remaining.length > 0) {
    // Find nodes whose dependencies are either:
    // 1. Already in sorted array, or
    // 2. Not in remaining array (existing in flow)
    const canProcess = remaining.filter((node) => {
      const depId = findSourceNodeId(node, learningMap);
      return (
        !depId || // No dependency
        sorted.some((s) => s.id === depId) || // Dependency already processed
        !remaining.some((r) => r.id === depId)
      ); // Dependency not in this batch
    });

    if (canProcess.length === 0) {
      // Circular dependency or missing dependency - process remaining in order
      sorted.push(...remaining);
      break;
    }

    sorted.push(...canProcess);
    canProcess.forEach((node) => {
      const index = remaining.findIndex((r) => r.id === node.id);
      remaining.splice(index, 1);
    });
  }

  return sorted;
};

export function useMapCore(
  flow: ReactFlowInstance,
  onLayoutComplete?: (nodes: MapNode[], edges: MapEdge[]) => void
) {
  const newlyAddedNodeId = useRef<string | null>(null);
  const newlyAddedNodeIds = useRef<string[]>([]);
  const hasCompletedFirstLayout = useRef<boolean>(false);

  const centerOnArticleNode = useCallback(
    (nodes: MapNode[], nodeIds: string[]) => {
      const articleNode = nodes.find(
        (node) => nodeIds.includes(node.id) && node.type === "articleNode"
      );

      if (articleNode) {
        logger.info("Centering viewport on article node", {
          nodeId: articleNode.id,
          position: articleNode.position,
          measured: articleNode.measured,
          width: articleNode.width,
          height: articleNode.height,
        });

        const nodeWidth = articleNode.width || articleNode.measured?.width || 350;
        const nodeHeight = articleNode.height || articleNode.measured?.height || 350;

        if (!articleNode.width && !articleNode.measured?.width) {
          logger.warn("Using fallback width for centering - node not measured yet", {
            nodeId: articleNode.id,
            fallbackWidth: 350,
          });
        }
        if (!articleNode.height && !articleNode.measured?.height) {
          logger.warn("Using fallback height for centering - node not measured yet", {
            nodeId: articleNode.id,
            fallbackHeight: 350,
          });
        }
        const centerX = articleNode.position.x + nodeWidth / 2;
        const centerY = articleNode.position.y + nodeHeight / 2;

        logger.info("Calculated article node center", {
          centerX,
          centerY,
          nodeWidth,
          nodeHeight,
        });

        flow.setCenter(centerX, centerY, { zoom: 0.8, duration: 300 });
      } else {
        logger.info("No article node found to center on", { nodeIds });
      }
    },
    [flow]
  );

  const handleLayoutComplete = useCallback(
    (nodes: MapNode[], edges: MapEdge[]) => {
      logger.info("handleLayoutComplete called", {
        nodesCount: nodes.length,
        edgesCount: edges.length,
        hasCompletedFirstLayout: hasCompletedFirstLayout.current,
        newlyAddedNodeId: newlyAddedNodeId.current,
        newlyAddedNodeIds: JSON.stringify(newlyAddedNodeIds.current),
        nodes: JSON.stringify(nodes.map((n) => ({ id: n.id, position: n.position }))),
      });

      if (!hasCompletedFirstLayout.current) {
        logger.info("First layout - showing all nodes");

        // Center viewport on the root article before making nodes visible
        const allNodes = flow.getNodes();
        const rootNode = allNodes.find((node) => node.data?.isRoot === true);
        if (rootNode) {
          logger.info("Centering viewport on root node", {
            rootNodeId: rootNode.id,
            position: rootNode.position,
            measured: rootNode.measured,
            width: rootNode.width,
            height: rootNode.height,
          });

          // Calculate the center of the node
          const nodeWidth = rootNode.width || rootNode.measured?.width || 350;
          const nodeHeight = rootNode.height || rootNode.measured?.height || 350;
          const centerX = rootNode.position.x + nodeWidth / 2;
          const centerY = rootNode.position.y + nodeHeight / 2;

          logger.info("Calculated node center", {
            centerX,
            centerY,
            nodeWidth,
            nodeHeight,
          });

          flow.setCenter(centerX, centerY, { zoom: 0.8, duration: 100 });
        }

        const updatedNodes = flow.getNodes().map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            pointerEvents: "auto" as const,
            transition: "opacity 0.5s ease-in-out",
          },
        }));
        const updatedEdges = flow.getEdges().map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            opacity: 1,
            transition: "opacity 0.5s ease-in-out",
          },
        }));

        logger.info("Setting nodes and edges visible", {
          updatedNodesCount: updatedNodes.length,
          updatedEdgesCount: updatedEdges.length,
          updatedNodes: JSON.stringify(
            updatedNodes.map((n) => ({ id: n.id, opacity: n.style?.opacity }))
          ),
        });

        flow.setNodes(updatedNodes);
        flow.setEdges(updatedEdges);
        hasCompletedFirstLayout.current = true;
      }
      // Show the newly added node after layout completes
      else if (newlyAddedNodeId.current) {
        logger.info("Subsequent layout - showing newly added node", {
          newlyAddedNodeId: newlyAddedNodeId.current,
        });

        const updatedNodes = flow.getNodes().map((node) =>
          node.id === newlyAddedNodeId.current
            ? {
                ...node,
                style: {
                  ...node.style,
                  opacity: 1,
                  pointerEvents: "auto" as const,
                  transition: "opacity 0.5s ease-in-out",
                },
              }
            : node
        );
        const updatedEdges = flow.getEdges().map((edge) =>
          edge.target === newlyAddedNodeId.current
            ? {
                ...edge,
                style: {
                  ...edge.style,
                  opacity: 1,
                  transition: "opacity 0.5s ease-in-out",
                },
              }
            : edge
        );

        logger.info("Updated nodes for newly added", {
          updatedNodesCount: updatedNodes.length,
          updatedEdgesCount: updatedEdges.length,
          visibleNodes: JSON.stringify(
            updatedNodes.filter((n) => n.style?.opacity === 1).map((n) => ({ id: n.id }))
          ),
        });

        flow.setNodes(updatedNodes);
        flow.setEdges(updatedEdges);

        if (newlyAddedNodeId.current) {
          centerOnArticleNode(updatedNodes, [newlyAddedNodeId.current]);
        }

        newlyAddedNodeId.current = null;
      }
      // Show newly added nodes from chain
      else if (newlyAddedNodeIds.current.length > 0) {
        logger.info("Subsequent layout - showing newly added nodes from chain", {
          newlyAddedNodeIds: JSON.stringify(newlyAddedNodeIds.current),
        });

        const updatedNodes = flow.getNodes().map((node) =>
          newlyAddedNodeIds.current.includes(node.id)
            ? {
                ...node,
                style: {
                  ...node.style,
                  opacity: 1,
                  pointerEvents: "auto" as const,
                  transition: "opacity 0.5s ease-in-out",
                },
              }
            : node
        );
        const updatedEdges = flow.getEdges().map((edge) =>
          newlyAddedNodeIds.current.includes(edge.target)
            ? {
                ...edge,
                style: {
                  ...edge.style,
                  opacity: 1,
                  transition: "opacity 0.5s ease-in-out",
                },
              }
            : edge
        );

        logger.info("Updated nodes for newly added chain", {
          updatedNodesCount: updatedNodes.length,
          updatedEdgesCount: updatedEdges.length,
          visibleNodes: JSON.stringify(
            updatedNodes.filter((n) => n.style?.opacity === 1).map((n) => ({ id: n.id }))
          ),
        });

        flow.setNodes(updatedNodes);
        flow.setEdges(updatedEdges);

        centerOnArticleNode(updatedNodes, newlyAddedNodeIds.current);

        newlyAddedNodeIds.current = [];
      } else {
        logger.info("Layout complete but no visibility changes needed");
      }

      // Call the original callback if provided
      if (onLayoutComplete) {
        onLayoutComplete(nodes, edges);
      }
    },
    [flow, onLayoutComplete, centerOnArticleNode]
  );

  const runLayout = useElkLayout(flow, handleLayoutComplete);

  const addNode = useCallback(
    (options: NodeCreationOptions) => {
      const { type, data, sourceNodeId } = options;
      const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const nodes = flow.getNodes();
      const src = sourceNodeId ? flow.getNode(sourceNodeId) : nodes[nodes.length - 1] || nodes[0];

      if (!src) {
        console.warn("No source node available for node positioning");
        return;
      }

      const newNode: MapNode = {
        id,
        type: type === "question" ? "questionNode" : "articleNode",
        position: { x: -9999, y: -9999 },
        data: { ...data, id },
        style: {
          opacity: 0,
          pointerEvents: "none" as const,
          transition: "opacity 0.5s ease-in-out",
        },
        finalPosition: {
          x: src.position.x + 200,
          y: src.position.y + 100,
        },
      } as MapNode;

      const newEdge: MapEdge = {
        id: `${src.id}-${id}`,
        source: src.id,
        target: id,
        type: "smoothstep",
        animated: false,
        style: {
          opacity: 0,
          transition: "opacity 0.5s ease-in-out",
        },
      } as MapEdge;

      flow.addNodes([newNode]);
      flow.addEdges([newEdge]);

      // Track the newly added node for auto-show after layout
      newlyAddedNodeId.current = id;
    },
    [flow]
  );

  const replaceNode = useCallback(
    (options: NodeReplacementOptions) => {
      const { id, newNode } = options;

      const existingNode = flow.getNode(id);

      if (!existingNode) {
        console.warn("Node not found");
        return;
      }

      // Preserve the visibility state and position of the existing node
      const updatedNode = {
        ...newNode,
        position: existingNode.position, // Keep existing position
        style: {
          ...newNode.style,
          opacity: existingNode.style?.opacity || 1,
          pointerEvents: existingNode.style?.pointerEvents || "auto",
        },
      };

      flow.updateNode(id, updatedNode, { replace: true });
    },
    [flow]
  );

  const showHiddenNodes = useCallback(() => {
    const nodes = flow.getNodes().map((n) =>
      n.style?.opacity === 0
        ? {
            ...n,
            style: { ...n.style, opacity: 1, pointerEvents: "auto" as const },
          }
        : n
    );
    const edges = flow
      .getEdges()
      .map((e) => (e.style?.opacity === 0 ? { ...e, style: { ...e.style, opacity: 1 } } : e));
    flow.setNodes(nodes);
    flow.setEdges(edges);
  }, [flow]);

  const addDependentNodesChain = useCallback(
    (newNodes: MapNode[], learningMap: SerializedLearningMap) => {
      logger.info("Starting addDependentNodesChain", {
        newNodesCount: newNodes.length,
        newNodes: JSON.stringify(newNodes.map((n) => ({ id: n.id, type: n.type, data: n.data }))),
        learningMap: JSON.stringify(learningMap),
      });

      // Track the nodes we're adding for visibility after layout
      newlyAddedNodeIds.current = newNodes.map((n) => n.id);
      logger.info("Tracking newly added node IDs", {
        newlyAddedNodeIds: JSON.stringify(newlyAddedNodeIds.current),
      });

      // Step 1: Sort nodes by dependency order (parents before children)
      const sortedNodes = sortNodesByDependencies(newNodes, learningMap);
      logger.info("Sorted nodes by dependencies", {
        sortedNodes: JSON.stringify(sortedNodes.map((n) => ({ id: n.id, type: n.type }))),
      });

      // Step 2: Single atomic update using setNodes functional update
      flow.setNodes((currentNodes) => {
        logger.info("Inside setNodes functional update", {
          currentNodesCount: currentNodes.length,
          currentNodeIds: JSON.stringify(currentNodes.map((n) => n.id)),
        });

        const updatedNodes = [...currentNodes]; // Start with all existing nodes
        const newEdges: MapEdge[] = [];

        // Step 3: Process each node in dependency order
        sortedNodes.forEach((mapNode, index) => {
          const sourceNodeId = findSourceNodeId(mapNode, learningMap);
          logger.info(`Processing node ${index + 1}/${sortedNodes.length}`, {
            nodeId: mapNode.id,
            nodeType: mapNode.type,
            sourceNodeId,
            nodeData: JSON.stringify(mapNode.data),
          });

          // Step 4: Find source in BOTH existing AND newly added nodes
          const sourceNode =
            updatedNodes.find((n) => n.id === sourceNodeId) ||
            updatedNodes[updatedNodes.length - 1] ||
            updatedNodes[0];

          logger.info("Source node lookup result", {
            sourceNodeId,
            sourceNodeFound: !!sourceNode,
            sourceNodeData: sourceNode
              ? JSON.stringify({ id: sourceNode.id, type: sourceNode.type })
              : null,
            updatedNodesCount: updatedNodes.length,
          });

          if (sourceNode) {
            // Step 5: Create node using EXACT same logic as current addNode
            const sourcePosition = sourceNode.finalPosition || sourceNode.position;
            const newNode: MapNode = {
              ...mapNode, // Use existing MapNode as base
              position: { x: -9999, y: -9999 }, // Off-screen initially (override)
              finalPosition: {
                // Add finalPosition for ELK layout
                x: sourcePosition.x + 200,
                y: sourcePosition.y + 100,
              },
            };

            logger.info("Created new node", {
              newNodeId: newNode.id,
              newNodeType: newNode.type,
              newNodeData: JSON.stringify(newNode.data),
              finalPosition: JSON.stringify(newNode.finalPosition),
            });

            // Step 6: Create edge using same logic as current addNode
            const newEdge: MapEdge = {
              id: `${sourceNode.id}-${newNode.id}`,
              source: sourceNode.id,
              target: newNode.id,
              type: "smoothstep",
              animated: false,
              style: {
                opacity: 0,
                transition: "opacity 0.5s ease-in-out",
              },
            };

            logger.info("Created new edge", {
              edgeId: newEdge.id,
              source: newEdge.source,
              target: newEdge.target,
            });

            // Step 7: Add to accumulated arrays
            updatedNodes.push(newNode);
            newEdges.push(newEdge);

            logger.info("Added to accumulated arrays", {
              updatedNodesCount: updatedNodes.length,
              newEdgesCount: newEdges.length,
            });
          } else {
            logger.warn("No source node found, skipping node creation", {
              nodeId: mapNode.id,
              sourceNodeId,
            });
          }
        });

        logger.info("Finished processing all nodes", {
          finalUpdatedNodesCount: updatedNodes.length,
          finalNewEdgesCount: newEdges.length,
          finalNodeIds: JSON.stringify(updatedNodes.map((n) => n.id)),
        });

        // Step 8: Add edges immediately (don't wait for next tick)
        if (newEdges.length > 0) {
          logger.info("Adding edges immediately", {
            edgeCount: newEdges.length,
            edges: JSON.stringify(
              newEdges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
            ),
          });
          flow.addEdges(newEdges);
        }

        return updatedNodes; // This becomes the new complete node state
      });

      logger.info("Completed addDependentNodesChain");
    },
    [flow]
  );

  return { addNode, replaceNode, showHiddenNodes, runLayout, addDependentNodesChain };
}
