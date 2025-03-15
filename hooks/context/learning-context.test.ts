import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  learningReducer,
  initialState,
  LEARNING_STATES,
  LearningState,
  LearningAction,
} from "./learning-context";

// Mock the server functions
vi.mock("@/prisma/subjects", () => ({
  getSubjectCurriculumMapId: vi.fn(),
  getSubject: vi.fn(),
  getAllSubjects: vi.fn(),
  getSubjectWithCurriculumMap: vi.fn(),
  createSubject: vi.fn(),
}));

vi.mock("@/prisma/personal-learning-maps", () => ({
  getPersonalLearningMap: vi.fn(),
  getPersonalLearningMapsByModule: vi.fn(),
  createPersonalLearningMap: vi.fn(),
  updatePersonalLearningMap: vi.fn(),
  updateMapContext: vi.fn(),
  deletePersonalLearningMap: vi.fn(),
}));

vi.mock("@/prisma/curriculum-maps", () => ({
  saveCurriculumMap: vi.fn(),
}));

describe("Learning Reducer", () => {
  it("should initialize learning context with subject and module IDs", () => {
    const action: LearningAction = {
      type: "INITIALISE_LEARNING_CONTEXT",
      payload: { subjectId: "subject-1", moduleId: "module-1" },
    };

    const newState = learningReducer(initialState, action);

    expect(newState.subjectId).toBe("subject-1");
    expect(newState.moduleId).toBe("module-1");
    expect(newState.status).toBe("IDLE");
  });

  it("should transition to INITIALISING_LEARNING_MAP state", () => {
    const state: LearningState = {
      ...initialState,
      subjectId: "subject-1",
      moduleId: "module-1",
    };

    const action: LearningAction = { type: "INITIALISE_LEARNING_MAP_STARTED" };
    const newState = learningReducer(state, action);

    expect(newState.status).toBe("INITIALISING_LEARNING_MAP");
    expect(newState.error).toBeNull();
  });

  it("should transition to READY state with map ID", () => {
    const state: LearningState = {
      ...initialState,
      status: "INITIALISING_LEARNING_MAP",
      subjectId: "subject-1",
      moduleId: "module-1",
    };

    const action: LearningAction = {
      type: "INITIALISE_LEARNING_MAP_FINISHED",
      payload: { personalLearningMapId: "map-1" },
    };

    const newState = learningReducer(state, action);

    expect(newState.status).toBe("READY");
    expect(newState.personalLearningMapId).toBe("map-1");
  });

  it("should set error state", () => {
    const state: LearningState = {
      ...initialState,
      status: "INITIALISING_LEARNING_MAP",
    };

    const action: LearningAction = {
      type: "SET_ERROR",
      payload: { message: "Test error" },
    };

    const newState = learningReducer(state, action);

    expect(newState.error).toBe("Test error");
  });

  it("should reset state", () => {
    const state: LearningState = {
      status: "READY",
      articleContent: "Some content",
      personalLearningMapId: "map-1",
      error: null,
      subjectId: "subject-1",
      moduleId: "module-1",
    };

    const action: LearningAction = { type: "RESET" };
    const newState = learningReducer(state, action);

    expect(newState).toEqual(initialState);
  });
});
