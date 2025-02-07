import prisma from "@/lib/prisma";
import type { Subject } from "@prisma/client";
import { createServerFn } from "@tanstack/start";

export const createSubject = createServerFn({ method: "POST" })
  .validator((data: { title: string; description: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    console.log("Creating subject with data:", data);
    try {
      const subject = await prisma.subject.create({
        data: {
          title: data.title,
          description: data.description,
        },
      });
      console.log("Subject created:", subject);
      return subject;
    } catch (error) {
      console.error("Error in createSubject:", error);
      throw error;
    }
  });

export const getAllSubjects = createServerFn({ method: "GET" })
  .validator(() => {
    return {};
  })
  .handler(async () => {
    return prisma.subject.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });
  });

export const getSubjectById = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => {
    if (!data?.id) {
      throw new Error("Subject ID is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    return prisma.subject.findUnique({
      where: { id: data.id },
      include: {
        calibrationSettings: true,
        roadmapNodes: true,
        roadmapEdges: true,
        chatMessages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  });

export const updateSubject = createServerFn({ method: "PUT" })
  .validator((data: { id: string; data: Partial<Subject> }) => {
    if (!data?.id) {
      throw new Error("Subject ID is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    return prisma.subject.update({
      where: { id: data.id },
      data: data.data,
    });
  });

export const deleteSubject = createServerFn({ method: "DELETE" })
  .validator((data: { id: string }) => {
    if (!data?.id) {
      throw new Error("Subject ID is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    return prisma.subject.delete({
      where: { id: data.id },
    });
  });
