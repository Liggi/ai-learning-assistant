import {
  PrismaClient,
  Conversation,
  Message,
  Layout,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import {
  ConversationNode,
  ConversationEdge,
  LayoutData,
  nodesSchema,
  edgesSchema,
  nodeHeightsSchema,
  layoutDataSchema,
} from "@/types/conversation";
import { toPrismaJson, toNullableJson } from "@/utils/json";
import { createServerFn } from "@tanstack/start";
import { Logger } from "@/lib/logger";

// Initialize Prisma client and logger
const prisma = new PrismaClient();
const logger = new Logger({ context: "ConversationsService" });

// Serialization types
export type SerializedConversation = Omit<
  Conversation,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
  messages: SerializedMessage[];
};

export type SerializedMessage = Omit<
  Message,
  "createdAt" | "updatedAt" | "tooltips"
> & {
  createdAt: string;
  updatedAt: string;
  tooltips: Record<string, string> | null;
};

export type SerializedLayout = Omit<
  Layout,
  "createdAt" | "updatedAt" | "nodes" | "edges" | "nodeHeights"
> & {
  createdAt: string;
  updatedAt: string;
  nodes: ConversationNode[];
  edges: ConversationEdge[];
  nodeHeights: Record<string, number>;
};

// Define a more compatible type for server function return value
export type ServerSerializedLayout = {
  id: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: {
      id: string;
      text: string;
      summary: string;
      isUser: boolean;
      content?: { summary: string; takeaways: string[] };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    [key: string]: unknown;
  }>;
  nodeHeights: Record<string, number>;
};

// Create Zod schemas for serialized types
export const SerializedLayoutSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nodes: nodesSchema,
  edges: edgesSchema,
  nodeHeights: nodeHeightsSchema,
});

// Tooltips schema for validation
const tooltipsSchema = z.record(z.string(), z.string()).nullable();

// Conversation schema for validation
const getConversationSchema = z.object({
  id: z.string().uuid("Invalid conversation ID"),
});

const createConversationSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  moduleId: z.string(),
});

const addMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  text: z.string().min(1, "Message text is required"),
  isUser: z.boolean(),
  parentId: z.string().uuid("Invalid parent ID").optional(),
  tooltips: z.record(z.string(), z.string()).optional(),
});

const getMessagesSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

const saveLayoutSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  nodes: nodesSchema,
  edges: edgesSchema,
  nodeHeights: nodeHeightsSchema.optional().default({}),
});

const getLayoutSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
});

// Serialization functions
export function serializeConversation(
  conversation: Conversation & { messages: Message[] }
): SerializedConversation {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map(serializeMessage),
  };
}

export function serializeMessage(message: Message): SerializedMessage {
  // Parse tooltips with Zod for validation
  const tooltips = message.tooltips
    ? tooltipsSchema.parse(message.tooltips)
    : null;

  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    tooltips,
  };
}

export function serializeLayout(layout: Layout): SerializedLayout {
  // Parse layout data with Zod for validation
  const parsedLayout = layoutDataSchema.parse({
    nodes: layout.nodes,
    edges: layout.edges,
    nodeHeights: layout.nodeHeights,
  });

  return {
    ...layout,
    createdAt: layout.createdAt.toISOString(),
    updatedAt: layout.updatedAt.toISOString(),
    nodes: parsedLayout.nodes,
    edges: parsedLayout.edges,
    nodeHeights: parsedLayout.nodeHeights,
  };
}

// Database operations
export const getConversation = createServerFn({ method: "GET" })
  .validator((data: unknown) => getConversationSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedConversation | null> => {
    logger.info("Fetching conversation", { id: data.id });
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: data.id },
        include: { messages: true },
      });

      if (!conversation) {
        logger.warn("Conversation not found", { id: data.id });
        return null;
      }

      logger.info("Conversation fetched successfully", { id: data.id });
      return serializeConversation(conversation);
    } catch (error) {
      logger.error("Failed to fetch conversation", {
        error: error instanceof Error ? error.message : "Unknown error",
        id: data.id,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function getConversationLegacy(conversationId: string) {
  return getConversation({ data: { id: conversationId } });
}

export const createConversation = createServerFn({ method: "POST" })
  .validator((data: unknown) => createConversationSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedConversation> => {
    logger.info("Creating conversation", {
      subjectId: data.subjectId,
      moduleId: data.moduleId,
    });
    try {
      const conversation = await prisma.conversation.create({
        data: {
          subjectId: data.subjectId,
          moduleId: data.moduleId,
        },
        include: { messages: true },
      });

      logger.info("Conversation created successfully", { id: conversation.id });
      return serializeConversation(conversation);
    } catch (error) {
      logger.error("Failed to create conversation", {
        error: error instanceof Error ? error.message : "Unknown error",
        subjectId: data.subjectId,
        moduleId: data.moduleId,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function createConversationLegacy(
  subjectId: string,
  moduleId: string
) {
  return createConversation({ data: { subjectId, moduleId } });
}

export const addMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) => addMessageSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedMessage> => {
    logger.info("Adding message to conversation", {
      conversationId: data.conversationId,
      isUser: data.isUser,
      parentId: data.parentId,
    });
    try {
      // Validate tooltips with Zod
      const validatedTooltips = data.tooltips || null;

      const message = await prisma.message.create({
        data: {
          text: data.text,
          isUser: data.isUser,
          conversationId: data.conversationId,
          parentId: data.parentId,
          tooltips: toNullableJson(validatedTooltips),
        },
      });

      logger.info("Message added successfully", { id: message.id });
      return serializeMessage(message);
    } catch (error) {
      logger.error("Failed to add message", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: data.conversationId,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function addMessageLegacy(
  conversationId: string,
  text: string,
  isUser: boolean,
  parentId?: string,
  tooltips?: Record<string, string>
) {
  return addMessage({
    data: {
      conversationId,
      text,
      isUser,
      parentId,
      tooltips,
    },
  });
}

export const getMessages = createServerFn({ method: "GET" })
  .validator((data: unknown) => getMessagesSchema.parse(data))
  .handler(async ({ data }): Promise<SerializedMessage[]> => {
    logger.info("Fetching messages for conversation", {
      conversationId: data.conversationId,
    });
    try {
      const messages = await prisma.message.findMany({
        where: { conversationId: data.conversationId },
        orderBy: { createdAt: "asc" },
      });

      logger.info("Messages fetched successfully", {
        conversationId: data.conversationId,
        count: messages.length,
      });
      return messages.map(serializeMessage);
    } catch (error) {
      logger.error("Failed to fetch messages", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: data.conversationId,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function getMessagesLegacy(conversationId: string) {
  return getMessages({ data: { conversationId } });
}

export const saveLayout = createServerFn({ method: "POST" })
  .validator((data: unknown) => saveLayoutSchema.parse(data))
  .handler(async ({ data }) => {
    logger.info("Saving layout for conversation", {
      conversationId: data.conversationId,
    });
    try {
      const layout = await prisma.layout.upsert({
        where: { conversationId: data.conversationId },
        update: {
          nodes: toPrismaJson(data.nodes),
          edges: toPrismaJson(data.edges),
          nodeHeights: toPrismaJson(data.nodeHeights),
          updatedAt: new Date(),
        },
        create: {
          conversationId: data.conversationId,
          nodes: toPrismaJson(data.nodes),
          edges: toPrismaJson(data.edges),
          nodeHeights: toPrismaJson(data.nodeHeights),
        },
      });

      logger.info("Layout saved successfully", { id: layout.id });

      // Use a direct type assertion to bypass type checking
      // This is safe because we know the structure is correct from validation
      const serialized = serializeLayout(layout);
      return serialized as any;
    } catch (error) {
      logger.error("Failed to save layout", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: data.conversationId,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function saveLayoutLegacy(
  conversationId: string,
  nodes: ConversationNode[],
  edges: ConversationEdge[],
  nodeHeights: Record<string, number> = {}
) {
  return saveLayout({
    data: {
      conversationId,
      nodes,
      edges,
      nodeHeights,
    },
  });
}

export const getLayout = createServerFn({ method: "GET" })
  .validator((data: unknown) => getLayoutSchema.parse(data))
  .handler(async ({ data }) => {
    logger.info("Fetching layout for conversation", {
      conversationId: data.conversationId,
    });
    try {
      const layout = await prisma.layout.findUnique({
        where: { conversationId: data.conversationId },
      });

      if (!layout) {
        logger.warn("Layout not found", {
          conversationId: data.conversationId,
        });
        return null;
      }

      logger.info("Layout fetched successfully", { id: layout.id });

      // Use a direct type assertion to bypass type checking
      // This is safe because we know the structure is correct from validation
      const serialized = serializeLayout(layout);
      return serialized as any;
    } catch (error) {
      logger.error("Failed to fetch layout", {
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: data.conversationId,
      });
      throw error;
    }
  });

// For backward compatibility during migration
export async function getLayoutLegacy(conversationId: string) {
  return getLayout({ data: { conversationId } });
}
