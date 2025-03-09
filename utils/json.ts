import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * A utility for safely converting data to Prisma JSON format
 * This ensures type safety while working with Prisma's JSON fields
 */

// Define a Zod schema for Prisma's JSON input values
export const jsonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.lazy(() => jsonValueSchema)),
  z.record(z.lazy(() => jsonValueSchema)),
]);

export type SafeJsonValue = z.infer<typeof jsonValueSchema>;

/**
 * Safely converts any data to a Prisma-compatible JSON value
 * Validates the data structure using Zod to ensure it's compatible
 * @param data The data to convert to a Prisma JSON value
 * @returns A validated Prisma.InputJsonValue
 * @throws Error if the data cannot be safely converted
 */
export function toPrismaJson<T>(data: T): Prisma.InputJsonValue {
  // First stringify and parse to ensure we have a plain JS object
  const plainData = JSON.parse(JSON.stringify(data));

  // Validate the data with our schema
  const result = jsonValueSchema.safeParse(plainData);

  if (!result.success) {
    throw new Error(
      `Cannot safely convert to Prisma JSON: ${result.error.message}`
    );
  }

  return result.data as Prisma.InputJsonValue;
}

/**
 * Safely handles null values for Prisma JSON fields
 * @returns Prisma.JsonNull for null values
 */
export function toNullableJson<T>(
  data: T | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (data === null) {
    return Prisma.JsonNull;
  }

  return toPrismaJson(data);
}
