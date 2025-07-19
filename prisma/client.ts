import { PrismaClient } from "@prisma/client";
import { Logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Extended Prisma client that automatically bumps LearningMap.updatedAt whenever
// an Article or Question is created / updated / deleted.
// ---------------------------------------------------------------------------

// We create a *base* client first so we can reuse it inside our extension
const basePrisma = new PrismaClient();

const log = new Logger({ context: "PrismaTouchMap", enabled: false });

const prisma = basePrisma.$extends({
  query: {
    article: {
      async create({ args, query }) {
        const result = await query(args);
        if (args.data.learningMapId) {
          log.info("Touching learning map", {
            learningMapId: args.data.learningMapId,
            action: "article.create",
          });
          await basePrisma.learningMap.update({
            where: { id: args.data.learningMapId },
            data: { updatedAt: new Date() },
          });
        }
        return result;
      },

      async update({ args, query }) {
        const result = await query(args);
        if (result.learningMapId) {
          log.info("Touching learning map", {
            learningMapId: result.learningMapId,
            action: "article.update",
          });
          await basePrisma.learningMap.update({
            where: { id: result.learningMapId },
            data: { updatedAt: new Date() },
          });
        }
        return result;
      },

      async delete({ args, query }) {
        // Find the learningMapId first (the row will be gone after delete)
        const article = await basePrisma.article.findUnique({
          where: args.where,
          select: { learningMapId: true },
        });
        const result = await query(args);
        if (article?.learningMapId) {
          log.info("Touching learning map", {
            learningMapId: article.learningMapId,
            action: "article.delete",
          });
          await basePrisma.learningMap.update({
            where: { id: article.learningMapId },
            data: { updatedAt: new Date() },
          });
        }
        return result;
      },
    },

    question: {
      async create({ args, query }) {
        const result = await query(args);
        if (args.data.learningMapId) {
          log.info("Touching learning map", {
            learningMapId: args.data.learningMapId,
            action: "question.create",
          });
          await basePrisma.learningMap.update({
            where: { id: args.data.learningMapId },
            data: { updatedAt: new Date() },
          });
        }
        return result;
      },

      async update({ args, query }) {
        const result = await query(args);
        if (result.learningMapId) {
          log.info("Touching learning map", {
            learningMapId: result.learningMapId,
            action: "question.update",
          });
          await basePrisma.learningMap.update({
            where: { id: result.learningMapId },
            data: { updatedAt: new Date() },
          });
        }
        return result;
      },

      async delete({ args, query }) {
        // Need the learningMapId before deleting the question
        const question = await basePrisma.question.findUnique({
          where: args.where,
          select: { learningMapId: true },
        });
        const result = await query(args);
        if (question?.learningMapId) {
          log.info("Touching learning map", {
            learningMapId: question.learningMapId,
            action: "question.delete",
          });
          await basePrisma.learningMap.update({
            where: { id: question.learningMapId },
            data: { updatedAt: new Date() },
          });
        }
        return result;
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Typings & global singleton pattern
// ---------------------------------------------------------------------------

type PrismaExtendedClient = typeof prisma;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaExtendedClient | undefined;
}

if (process.env.NODE_ENV !== "production") {
  global.prisma = global.prisma ?? prisma;
}

export { prisma };
export default prisma;
