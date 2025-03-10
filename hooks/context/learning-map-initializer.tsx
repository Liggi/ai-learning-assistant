import React, { useEffect, useState } from "react";
import { useSubjectCurriculumMapId } from "@/hooks/api/subjects";
import {
  usePersonalLearningMapsByModule,
  useCreatePersonalLearningMap,
} from "@/hooks/api/personal-learning-maps";
import { useLearningContext } from "./learning-context";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "LearningMapInitializer" });

/**
 * Main component that orchestrates the initialization flow
 */
export const LearningMapInitializer: React.FC = () => {
  const { state, dispatch } = useLearningContext();

  const enabled = state.status === "INITIALISING_LEARNING_MAP";

  // Step 1: Fetch the curriculum map ID for the current subject
  const { data: curriculumMapResponse, error: curriculumMapError } =
    useSubjectCurriculumMapId(state.subjectId, enabled);

  const curriculumMapId = curriculumMapResponse?.curriculumMapId;

  // Log errors if curriculum map couldn't be fetched
  if (curriculumMapError) {
    logger.error("Error fetching curriculum map", {
      error: curriculumMapError,
    });
    return null;
  }

  if (curriculumMapId) {
    // Step 2: Once we have the curriculum map ID, render the component
    // that will fetch personal learning maps
    return (
      <PersonalLearningMapLoader
        curriculumMapId={curriculumMapId}
        moduleId={state.moduleId || ""}
      />
    );
  }

  return null;
};

/**
 * This component handles the second step of initialization:
 * fetching personal learning maps once we have the curriculum map ID
 */
const PersonalLearningMapLoader: React.FC<{
  curriculumMapId: string;
  moduleId: string;
}> = ({ curriculumMapId, moduleId }) => {
  const { state, dispatch } = useLearningContext();
  const [isCreatingMap, setIsCreatingMap] = useState(false);

  const enabled = state.status === "INITIALISING_LEARNING_MAP";

  // Now we can safely use the curriculumMapId from props
  const { data: existingMaps, error: existingMapsError } =
    usePersonalLearningMapsByModule(curriculumMapId, moduleId, enabled);

  // Add the mutation hook for creating a new map
  const createMapMutation = useCreatePersonalLearningMap();

  const { mutate } = createMapMutation;

  useEffect(() => {
    if (!existingMaps) return;
    if (state.personalLearningMapId) return;
    if (isCreatingMap) return;

    logger.info("Personal learning maps fetched", {
      count: existingMaps.length,
      mapIds: existingMaps.map((map) => map.id),
    });

    // If maps exist, use the first one
    if (existingMaps.length > 0) {
      const personalLearningMapId = existingMaps[0].id;

      // Update the state with the map ID
      dispatch({
        type: "INITIALISE_LEARNING_MAP_FINISHED",
        payload: { personalLearningMapId },
      });
    }
    // If no maps exist, create one
    else {
      logger.info("No existing maps found, creating a new one");

      if (state.subjectId && moduleId) {
        setIsCreatingMap(true);
        createMapMutation.mutate(
          {
            subjectId: state.subjectId,
            moduleId: moduleId,
          },
          {
            onSuccess: (newMap) => {
              logger.info("Created new personal learning map", {
                id: newMap.id,
              });

              // Update the state with the new map ID
              dispatch({
                type: "INITIALISE_LEARNING_MAP_FINISHED",
                payload: { personalLearningMapId: newMap.id },
              });
              setIsCreatingMap(false);
            },
            onError: (error) => {
              logger.error("Failed to create personal learning map", { error });
              dispatch({
                type: "SET_ERROR",
                payload: { message: "Failed to create learning map" },
              });
              setIsCreatingMap(false);
            },
          }
        );
      }
    }
  }, [
    existingMaps,
    dispatch,
    state.subjectId,
    moduleId,
    mutate,
    state.personalLearningMapId,
    isCreatingMap,
  ]);

  if (existingMapsError) {
    logger.error("Error fetching personal learning maps", {
      error: existingMapsError,
    });
  }

  return null;
};
