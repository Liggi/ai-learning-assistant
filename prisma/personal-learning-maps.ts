import { z } from "zod";
import prisma from "@/prisma/client";
import { createServerFn } from "@tanstack/start";
import {
  PersonalLearningMapSchema,
  MapContextSchema,
  ArticleSchema,
  UserQuestionSchema,
  LayoutSchema,
} from "./generated/zod";
import {
  personalLearningMapSchema,
  mapContextSchema,
  articleSchema,
  userQuestionSchema,
  layoutSchema,
  layoutDataSchema,
} from "@/types/personal-learning-map";
import { Logger } from "@/lib/logger";
import { serializeArticle } from "./articles";

const logger = new Logger({ context: "PersonalLearningMapService" });

/**
 * Server function to get or create a personal learning map
 * This centralizes the "find or create" logic on the server side
 */
const getOrCreatePersonalLearningMapSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  moduleId: z.string().min(1, "Module ID is required"),
});

export const getOrCreatePersonalLearningMap = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    getOrCreatePersonalLearningMapSchema.parse(data)
  )
  .handler(async ({ data }): Promise<SerializedPersonalLearningMap> => {
    const { subjectId, moduleId } = data;

    logger.info("Getting or creating personal learning map", {
      subjectId,
      moduleId,
    });

    // Get curriculum map ID
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { curriculumMap: true },
    });

    if (!subject || !subject.curriculumMap) {
      logger.error("Subject or curriculum map not found", { subjectId });
      throw new Error("Subject or curriculum map not found");
    }

    const curriculumMapId = subject.curriculumMap.id;

    // Find existing maps through MapContext
    const existingMapContexts = await prisma.mapContext.findMany({
      where: {
        curriculumMapId,
        moduleId,
        subjectId,
      },
      include: {
        personalLearningMap: true,
      },
    });

    logger.info("Found existing map contexts", {
      count: existingMapContexts.length,
    });

    // Return existing map or create new one
    if (
      existingMapContexts.length > 0 &&
      existingMapContexts[0].personalLearningMap
    ) {
      return serializePersonalLearningMap(
        existingMapContexts[0].personalLearningMap
      );
    } else {
      logger.info("Creating new personal learning map");

      // Create a new personal learning map with its context
      const newMap = await prisma.personalLearningMap.create({
        data: {
          mapContext: {
            create: {
              curriculumMapId,
              moduleId,
              subjectId,
            },
          },
        },
        include: {
          mapContext: true,
        },
      });

      return serializePersonalLearningMap(newMap);
    }
  });

// Type definitions using Prisma and Zod generated schemas
type PrismaPersonalLearningMap = z.infer<typeof PersonalLearningMapSchema>;
type PrismaMapContext = z.infer<typeof MapContextSchema>;
type PrismaArticle = z.infer<typeof ArticleSchema>;
type PrismaUserQuestion = z.infer<typeof UserQuestionSchema>;
type PrismaLayout = z.infer<typeof LayoutSchema>;

// Simplified serialized types for server function returns
export type SerializedPersonalLearningMap = {
  id: string;
  createdAt: string;
  updatedAt: string;
  articles?: Array<{
    id: string;
    content: string;
    personalLearningMapId: string;
    isRoot: boolean;
    createdAt: string;
    updatedAt: string;
    contextualTooltips?: any[];
  }>;
  userQuestions?: Array<{
    id: string;
    text: string;
    personalLearningMapId: string;
    sourceArticleId: string;
    destinationArticleId: string;
    isImplicit: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  layout?: {
    id: string;
    personalLearningMapId: string;
    nodes: any[];
    edges: any[];
    nodeHeights: Record<string, number>;
    createdAt: string;
    updatedAt: string;
  };
  mapContext?: {
    id: string;
    curriculumMapId: string;
    moduleId: string;
    personalLearningMapId: string;
    subjectId: string;
    createdAt: string;
    updatedAt: string;
  };
};

/**
 * Serializes a MapContext from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeMapContext(mapContext: PrismaMapContext) {
  return {
    ...mapContext,
    createdAt: mapContext.createdAt.toISOString(),
    updatedAt: mapContext.updatedAt.toISOString(),
  };
}

/**
 * Serializes a UserQuestion from the database to a client-friendly format
 * Converts Date objects to ISO strings
 */
export function serializeUserQuestion(question: PrismaUserQuestion) {
  return {
    ...question,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

/**
 * Serializes a Layout from the database to a client-friendly format
 * Converts Date objects to ISO strings and properly parses the JSON fields
 */
export function serializeLayout(layout: PrismaLayout) {
  return {
    ...layout,
    createdAt: layout.createdAt.toISOString(),
    updatedAt: layout.updatedAt.toISOString(),
    nodes: JSON.parse(JSON.stringify(layout.nodes)),
    edges: JSON.parse(JSON.stringify(layout.edges)),
    nodeHeights: JSON.parse(JSON.stringify(layout.nodeHeights)),
  };
}

/**
 * Serializes a PersonalLearningMap from the database to a client-friendly format
 * Handles all nested relations and converts Date objects to ISO strings
 */
export function serializePersonalLearningMap(
  map: PrismaPersonalLearningMap & {
    articles?: PrismaArticle[];
    userQuestions?: PrismaUserQuestion[];
    layout?: PrismaLayout | null;
    mapContext?: PrismaMapContext | null;
  }
): SerializedPersonalLearningMap {
  return {
    ...map,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
    articles: map.articles ? map.articles.map(serializeArticle) : undefined,
    userQuestions: map.userQuestions
      ? map.userQuestions.map(serializeUserQuestion)
      : undefined,
    layout: map.layout ? serializeLayout(map.layout) : undefined,
    mapContext: map.mapContext
      ? serializeMapContext(map.mapContext)
      : undefined,
  };
}

/**
 * Server function to create a new personal learning map associated with a module in a curriculum map
 */
export const createPersonalLearningMap = createServerFn({ method: "POST" })
  .validator((data: { subjectId: string; moduleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Creating personal learning map", data);
    try {
      // Verify subject and curriculum map exist
      const subject = await prisma.subject.findUnique({
        where: { id: data.subjectId },
        include: { curriculumMap: true },
      });

      if (!subject) {
        throw new Error(`Subject not found: ${data.subjectId}`);
      }

      if (!subject.curriculumMap) {
        throw new Error(
          `Curriculum map not found for subject: ${data.subjectId}`
        );
      }

      // Use the curriculum map ID from the subject relation
      const curriculumMapId = subject.curriculumMap.id;

      // Create personal learning map with context
      const personalLearningMap = await prisma.personalLearningMap.create({
        data: {
          mapContext: {
            create: {
              curriculumMapId,
              moduleId: data.moduleId,
              subjectId: data.subjectId,
            },
          },
        },
        include: {
          mapContext: true,
        },
      });

      logger.info("Personal learning map created successfully", {
        id: personalLearningMap.id,
      });
      return serializePersonalLearningMap(personalLearningMap);
    } catch (error) {
      logger.error("Error creating personal learning map", { error });
      throw error;
    }
  });

/**
 * Server function to get a personal learning map by ID with all related data
 */
export const getPersonalLearningMap = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting personal learning map", { id: data.id });
    try {
      const personalLearningMap = await prisma.personalLearningMap.findUnique({
        where: { id: data.id },
        include: {
          articles: true,
          userQuestions: true,
          layout: true,
          mapContext: true,
        },
      });

      if (!personalLearningMap) {
        return null;
      }

      return serializePersonalLearningMap(personalLearningMap);
    } catch (error) {
      logger.error("Error getting personal learning map", { error });
      throw error;
    }
  });

/**
 * Server function to get personal learning maps by curriculum map ID and module ID
 */
export const getPersonalLearningMapsByModule = createServerFn({ method: "GET" })
  .validator((data: { curriculumMapId: string; moduleId: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Getting personal learning maps by module", data);
    try {
      const personalLearningMaps = await prisma.personalLearningMap.findMany({
        where: {
          mapContext: {
            curriculumMapId: data.curriculumMapId,
            moduleId: data.moduleId,
          },
        },
        include: {
          mapContext: true,
        },
      });

      return personalLearningMaps.map(serializePersonalLearningMap);
    } catch (error) {
      logger.error("Error getting personal learning maps by module", { error });
      throw error;
    }
  });

/**
 * Server function to update a personal learning map's metadata
 */
export const updatePersonalLearningMap = createServerFn({ method: "POST" })
  .validator((data: { id: string; metadata?: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    logger.info("Updating personal learning map", { id: data.id });
    try {
      // Check if the personal learning map exists
      const existingMap = await prisma.personalLearningMap.findUnique({
        where: { id: data.id },
      });

      if (!existingMap) {
        throw new Error(`Personal learning map not found: ${data.id}`);
      }

      // Update the personal learning map
      const updatedMap = await prisma.personalLearningMap.update({
        where: { id: data.id },
        data: {
          // Add metadata or other fields as needed
          // For now, we're just updating the timestamp
        },
        include: {
          articles: true,
          userQuestions: true,
          layout: true,
          mapContext: true,
        },
      });

      logger.info("Personal learning map updated successfully", {
        id: updatedMap.id,
      });
      return serializePersonalLearningMap(updatedMap);
    } catch (error) {
      logger.error("Error updating personal learning map", { error });
      throw error;
    }
  });

/**
 * Server function to update a map context, changing the association with a curriculum map module
 */
export const updateMapContext = createServerFn({ method: "POST" })
  .validator(
    (data: {
      personalLearningMapId: string;
      curriculumMapId: string;
      moduleId: string;
      subjectId: string;
    }) => data
  )
  .handler(async ({ data }) => {
    logger.info("Updating map context", data);
    try {
      // Check if the personal learning map exists
      const existingMap = await prisma.personalLearningMap.findUnique({
        where: { id: data.personalLearningMapId },
        include: { mapContext: true },
      });

      if (!existingMap) {
        throw new Error(
          `Personal learning map not found: ${data.personalLearningMapId}`
        );
      }

      let mapContext;

      if (existingMap.mapContext) {
        // Update existing map context
        mapContext = await prisma.mapContext.update({
          where: { id: existingMap.mapContext.id },
          data: {
            curriculumMapId: data.curriculumMapId,
            moduleId: data.moduleId,
            subjectId: data.subjectId,
          },
        });
      } else {
        // Create new map context if it doesn't exist
        mapContext = await prisma.mapContext.create({
          data: {
            curriculumMapId: data.curriculumMapId,
            moduleId: data.moduleId,
            subjectId: data.subjectId,
            personalLearningMapId: data.personalLearningMapId,
          },
        });
      }

      logger.info("Map context updated successfully", {
        id: mapContext.id,
      });
      return serializeMapContext(mapContext);
    } catch (error) {
      logger.error("Error updating map context", { error });
      throw error;
    }
  });

/**
 * Server function to delete a personal learning map and all related data
 */
export const deletePersonalLearningMap = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    logger.info("Deleting personal learning map", { id: data.id });
    try {
      // Check if the personal learning map exists
      const existingMap = await prisma.personalLearningMap.findUnique({
        where: { id: data.id },
      });

      if (!existingMap) {
        throw new Error(`Personal learning map not found: ${data.id}`);
      }

      // Delete the personal learning map (cascades to related entities)
      await prisma.personalLearningMap.delete({
        where: { id: data.id },
      });

      logger.info("Personal learning map deleted successfully", {
        id: data.id,
      });
      return { success: true, id: data.id };
    } catch (error) {
      logger.error("Error deleting personal learning map", { error });
      throw error;
    }
  });

/**
 * Server function to get the root article for a personal learning map
 */
// Function moved to articles.ts
