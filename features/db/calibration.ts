import prisma from "@/lib/prisma";

export async function saveCalibrationSettings(data: {
  subjectId: string;
  selectedKnowledgeNodes: string[];
}) {
  return prisma.calibrationSettings.upsert({
    where: {
      subjectId: data.subjectId,
    },
    update: {
      selectedKnowledgeNodes: data.selectedKnowledgeNodes,
    },
    create: {
      subjectId: data.subjectId,
      selectedKnowledgeNodes: data.selectedKnowledgeNodes,
    },
  });
}

export async function getCalibrationSettings(subjectId: string) {
  return prisma.calibrationSettings.findUnique({
    where: {
      subjectId,
    },
  });
}
