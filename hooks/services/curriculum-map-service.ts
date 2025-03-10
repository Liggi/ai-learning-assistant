import { useState, useCallback, useMemo } from "react";
import {
  useSubjectWithCurriculumMap,
  useSaveCurriculumMap,
} from "@/hooks/api/subjects";
import { SerializedSubject } from "@/prisma/subjects";
import type { Node, Edge } from "@xyflow/react";
import { Logger } from "@/lib/logger";
import { generate as generateCurriculumMap } from "@/features/generators/curriculum-map";
import { CurriculumMapNode, CurriculumMapEdge } from "@/types/curriculum-map";

// Create a logger instance for the curriculum map service
const logger = new Logger({ context: "CurriculumMapService" });

/**
 * CurriculumMapService hook for managing curriculum map state and operations
 * This replaces the previous roadmap functionality with the new domain model terminology
 */
export function useCurriculumMapService(subjectId: string | null) {
  // State
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // API hooks
  const { data: subject, isLoading: isLoadingSubject } =
    useSubjectWithCurriculumMap(subjectId || "");
  const { mutateAsync: saveCurriculumMapAsync } = useSaveCurriculumMap();

  // Extracted values
  const curriculumMap = useMemo(
    () => subject?.curriculumMap || null,
    [subject]
  );
  const hasCurriculumMap = !!curriculumMap;

  /**
   * Generate a new curriculum map for a subject
   */
  const generateMap = useCallback(
    async (
      subject: SerializedSubject,
      priorKnowledge: string
    ): Promise<void> => {
      if (!subject.id) {
        const error = new Error("Cannot generate map: Subject ID is missing");
        setError(error);
        throw error;
      }

      try {
        setError(null);
        setIsGeneratingMap(true);
        logger.info("Generating curriculum map", { subjectId: subject.id });

        const generatedMap = await generateCurriculumMap({
          data: {
            subject: subject.title,
            priorKnowledge,
            subjectId: subject.id,
          },
        });

        logger.info("Generated curriculum map", {
          subjectId: subject.id,
          nodeCount: generatedMap.nodes.length,
          edgeCount: generatedMap.edges.length,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to generate curriculum map: ${error.message}`);
        setError(error);
        throw error;
      } finally {
        setIsGeneratingMap(false);
      }
    },
    []
  );

  /**
   * Save the curriculum map nodes and edges
   */
  const saveMap = useCallback(
    async (
      nodes: CurriculumMapNode[],
      edges: CurriculumMapEdge[]
    ): Promise<void> => {
      if (!subjectId) {
        const error = new Error("Cannot save map: Subject ID is missing");
        setError(error);
        throw error;
      }

      try {
        setError(null);
        logger.info("Saving curriculum map", { subjectId });

        await saveCurriculumMapAsync({
          subjectId,
          nodes,
          edges,
        });

        logger.info("Saved curriculum map", { subjectId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to save curriculum map: ${error.message}`);
        setError(error);
        throw error;
      }
    },
    [subjectId, saveCurriculumMapAsync]
  );

  /**
   * Select a node in the curriculum map
   */
  const selectNode = useCallback((nodeId: string) => {
    logger.info(`Selecting node: ${nodeId}`);
    setSelectedNodeId(nodeId);
  }, []);

  /**
   * Get a node by its ID
   */
  const getNodeById = useCallback(
    (nodeId: string): CurriculumMapNode | undefined => {
      if (!curriculumMap) return undefined;
      return curriculumMap.nodes.find((node) => node.id === nodeId);
    },
    [curriculumMap]
  );

  return useMemo(
    () => ({
      // State
      subject,
      curriculumMap,
      hasCurriculumMap,
      isGeneratingMap,
      isLoadingSubject,
      selectedNodeId,
      error,

      // Operations
      generateMap,
      saveMap,
      selectNode,
      getNodeById,
    }),
    [
      subject,
      curriculumMap,
      hasCurriculumMap,
      isGeneratingMap,
      isLoadingSubject,
      selectedNodeId,
      error,
      generateMap,
      saveMap,
      selectNode,
      getNodeById,
    ]
  );
}
