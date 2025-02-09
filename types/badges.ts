// Base badge interface for achievement badges
export interface Badge {
  name: string;
  description: string;
  level: "Bronze" | "Silver" | "Gold" | "Platinum";
}

// Learning Path badge interfaces
export interface LearningPathBadge {
  id: string;
  concept: string;
  suggestedQuestions: string[];
  prerequisites: string[];
  verificationCriteria: string;
}

// High-level learning path badge (for curriculum-wide concepts)
export interface CurriculumLearningPathBadge extends LearningPathBadge {
  subjectArea: string; // e.g. "Frontend Development"
}

// Low-level learning path badge (for module-specific concepts)
export interface ModuleLearningPathBadge extends LearningPathBadge {
  moduleId: string;
}

// Achievement badge interfaces (extending base Badge interface)
export interface AchievementBadge extends Badge {
  requirements: string[];
}

export interface ModuleAchievementBadge extends AchievementBadge {
  moduleId: string;
}

export interface CurriculumAchievementBadge extends AchievementBadge {
  subjectArea: string;
}
