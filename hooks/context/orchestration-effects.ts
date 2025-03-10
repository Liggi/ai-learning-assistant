import { LearningState, LearningAction } from "./learning-context";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "OrchestrationEffects" });

/**
 * Triggers the learning map initialization
 * The actual initialization will be handled by the LearningMapInitializer component
 * which uses React Query hooks to interact with the server
 */
export function initialiseLearningMap(
  state: LearningState,
  dispatch: React.Dispatch<LearningAction>
) {
  if (state.status !== "IDLE" || !state.subjectId || !state.moduleId) return;

  dispatch({
    type: "INITIALISE_LEARNING_MAP_STARTED",
  });
}
