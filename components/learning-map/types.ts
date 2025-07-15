import type { Node, Edge, XYPosition } from "@xyflow/react";

export interface ArticleNodeData extends Record<string, unknown> {
  id: string;
  content: {
    summary: string;
    takeaways: string[];
  };
  isUser: boolean;
  onClick?: (data: ArticleNodeData) => void;
}

export interface QuestionNodeData extends Record<string, unknown> {
  id: string;
  text: string;
  onClick?: (data: QuestionNodeData) => void;
}

export type MapNodeData = ArticleNodeData | QuestionNodeData;
export type MapNode = Node<MapNodeData> & {
  finalPosition?: XYPosition;
};
export type MapEdge = Edge;
