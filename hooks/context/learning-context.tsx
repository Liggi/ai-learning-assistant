import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
} from "react";
import * as orchestrationEffects from "./orchestration-effects";
import { Logger } from "@/lib/logger";
import { LearningMapInitializer } from "./learning-map-initializer";

const logger = new Logger({
  context: "LearningContext",
  enabled: true,
});

export const LEARNING_STATES = {
  IDLE: "IDLE",
  INITIALISING_LEARNING_MAP: "INITIALISING_LEARNING_MAP",
  READY: "READY",
};

export interface LearningState {
  status: keyof typeof LEARNING_STATES;
  articleContent: string;
  personalLearningMapId: string | null;
  error: string | null;
  subjectId: string | null;
  moduleId: string | null;
}

export type LearningAction =
  | {
      type: "INITIALISE_LEARNING_CONTEXT";
      payload: { subjectId: string; moduleId: string };
    }
  | {
      type: "INITIALISE_LEARNING_MAP_STARTED";
    }
  | {
      type: "INITIALISE_LEARNING_MAP_FINISHED";
      payload?: { personalLearningMapId: string };
    }
  | { type: "SET_ERROR"; payload: { message: string } }
  | { type: "RESET" };

export const initialState: LearningState = {
  status: "IDLE",
  articleContent: "",
  personalLearningMapId: null,
  error: null,
  subjectId: null,
  moduleId: null,
};

export function learningReducer(
  state: LearningState,
  action: LearningAction
): LearningState {
  let newState: LearningState;

  switch (action.type) {
    case "INITIALISE_LEARNING_CONTEXT":
      newState = {
        ...state,
        subjectId: action.payload.subjectId,
        moduleId: action.payload.moduleId,
      };
      break;

    case "INITIALISE_LEARNING_MAP_STARTED":
      newState = {
        ...state,
        status: "INITIALISING_LEARNING_MAP",
        error: null,
      };
      break;

    case "INITIALISE_LEARNING_MAP_FINISHED":
      newState = {
        ...state,
        status: "READY",
        personalLearningMapId:
          action.payload?.personalLearningMapId || state.personalLearningMapId,
      };
      break;

    case "SET_ERROR":
      newState = {
        ...state,
        error: action.payload.message,
      };
      break;

    case "RESET":
      newState = initialState;
      break;

    default:
      newState = state;
      break;
  }

  logger.group(`State transition: ${action.type}`, () => {
    logger.info("Action", action);
    logger.info("Previous state", state);
    logger.info("New state", newState);

    const stateChanges = Object.entries(newState).reduce(
      (acc, [key, value]) => {
        const typedKey = key as keyof LearningState;
        if (state[typedKey] !== value) {
          acc[key] = {
            from: state[typedKey],
            to: value,
          };
        }
        return acc;
      },
      {} as Record<string, { from: any; to: any }>
    );

    if (Object.keys(stateChanges).length > 0) {
      logger.info("Changes", stateChanges);
    } else {
      logger.info("No state changes");
    }
  });

  return newState;
}

type LearningContextType = {
  state: LearningState;
  dispatch: React.Dispatch<LearningAction>;
};

const LearningContext = createContext<LearningContextType | undefined>(
  undefined
);

interface LearningContextProviderProps {
  children: React.ReactNode;
  subjectId: string;
  moduleId: string;
}

/**
 * Custom hook to create bound orchestration functions
 */
function useOrchestrationFunctions(
  state: LearningState,
  dispatch: React.Dispatch<LearningAction>
) {
  return useMemo(() => {
    const orchestrationFunctions = {
      initialiseLearningMap: orchestrationEffects.initialiseLearningMap,
    };

    return Object.entries(orchestrationFunctions).reduce(
      (acc, [key, fn]) => {
        acc[key] = () => fn(state, dispatch);
        return acc;
      },
      {} as Record<string, () => void>
    );
  }, [state, dispatch]);
}

export const LearningContextProvider: React.FC<
  LearningContextProviderProps
> = ({ children, subjectId, moduleId }) => {
  const [state, dispatch] = useReducer(learningReducer, initialState);

  // Initialize context
  const initialiseContext = () => {
    if (state.status === "IDLE") {
      dispatch({
        type: "INITIALISE_LEARNING_CONTEXT",
        payload: { subjectId, moduleId },
      });
    }
  };
  useEffect(initialiseContext, [subjectId, moduleId, state.status]);

  const orchestrate = useOrchestrationFunctions(state, dispatch);

  useEffect(orchestrate.initialiseLearningMap, [
    state.status,
    state.subjectId,
    state.moduleId,
    orchestrate,
  ]);

  return (
    <LearningContext.Provider value={{ state, dispatch }}>
      <LearningMapInitializer />

      {children}
    </LearningContext.Provider>
  );
};

export const useLearningContext = (): LearningContextType => {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error(
      "useLearningContext must be used within a LearningContextProvider"
    );
  }
  return context;
};
