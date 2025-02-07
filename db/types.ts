export interface Subject {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationSettings {
  id: string;
  subjectId: string;
  selectedKnowledgeNodes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapNode {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  type: string;
  position: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapEdge {
  id: string;
  subjectId: string;
  source: string;
  target: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  subjectId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  updatedAt: string;
}
