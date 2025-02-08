import prisma from "@/prisma/client";
import type { Subject, Roadmap } from "@prisma/client";
import { createServerFn } from "@tanstack/start";
import { roadmapSchema } from "@/types/roadmap";
import type { Roadmap as RoadmapType } from "@/types/roadmap";

export interface SerializedSubject
  extends Omit<Subject, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
  roadmap?: RoadmapType | null;
}

export interface SerializedRoadmap
  extends Omit<Roadmap, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

export function serializeSubject(
  subject: Subject & { roadmap?: Roadmap | null }
): SerializedSubject {
  return {
    ...subject,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString(),
    roadmap: subject.roadmap
      ? roadmapSchema.parse({
          ...subject.roadmap,
          createdAt: subject.roadmap.createdAt.toISOString(),
          updatedAt: subject.roadmap.updatedAt.toISOString(),
        })
      : null,
  };
}

export const createSubject = createServerFn({ method: "POST" })
  .validator((data: { title: string }) => data)
  .handler(async ({ data }): Promise<SerializedSubject> => {
    console.log("Creating subject", data.title);
    const subject = await prisma.subject.create({
      data: { title: data.title },
      include: { roadmap: true },
    });
    return serializeSubject(subject);
  });

export const getAllSubjects = createServerFn({ method: "GET" }).handler(
  async () => {
    const subjects = await prisma.subject.findMany({
      include: { roadmap: true },
    });
    return subjects.map(serializeSubject);
  }
);

export const getSubjectWithRoadmap = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<SerializedSubject | null> => {
    console.log("Fetching subject with roadmap for ID:", data.id);
    const subject = await prisma.subject.findUnique({
      where: { id: data.id },
      include: { roadmap: true },
    });
    return subject ? serializeSubject(subject) : null;
  });
