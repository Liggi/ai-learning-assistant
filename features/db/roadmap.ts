import prisma from "@/lib/prisma";
import type { RoadmapNode, RoadmapEdge } from "@prisma/client";

export type CreateRoadmapNodeData = {
  subjectId: string;
  title: string;
  description: string;
  type: string;
  position: { x: number; y: number };
};

export type CreateRoadmapEdgeData = {
  subjectId: string;
  sourceId: string;
  targetId: string;
};

export async function saveRoadmap(data: {
  subjectId: string;
  nodes: CreateRoadmapNodeData[];
  edges: CreateRoadmapEdgeData[];
}) {
  // First delete existing roadmap for this subject
  await prisma.$transaction([
    prisma.roadmapEdge.deleteMany({
      where: { subjectId: data.subjectId },
    }),
    prisma.roadmapNode.deleteMany({
      where: { subjectId: data.subjectId },
    }),
  ]);

  // Then create new nodes and edges
  const nodes = await prisma.roadmapNode.createMany({
    data: data.nodes,
  });

  const edges = await prisma.roadmapEdge.createMany({
    data: data.edges,
  });

  return { nodes, edges };
}

export async function getRoadmap(subjectId: string) {
  const [nodes, edges] = await Promise.all([
    prisma.roadmapNode.findMany({
      where: { subjectId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.roadmapEdge.findMany({
      where: { subjectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { nodes, edges };
}
