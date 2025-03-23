import { PrismaClient } from "@prisma/client";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

// Create a mock of the Prisma client
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Mock the Prisma client module for tests
vi.mock("../prisma/client", () => ({
  prisma: prismaMock,
}));
