import { Prisma } from "@prisma/client";
import { z } from "zod";
import { Logger } from "@/lib/logger";

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

const logger = new Logger({ context: "PrismaJSON", enabled: false });

/**
 * Safely converts any data to a Prisma-compatible JSON value
 * Validates the data structure using Zod to ensure it's compatible
 * @param data The data to convert to a Prisma JSON value
 * @returns A validated Prisma.InputJsonValue
 * @throws Error if the data cannot be safely converted
 */
export function toPrismaJson<T>(data: T): Prisma.InputJsonValue {
  logger.group(
    "toPrismaJson conversion",
    () => {
      logger.info("Input data:", data);

      // First stringify and parse to ensure we have a plain JS object
      const plainData = JSON.parse(JSON.stringify(data));
      logger.info("After JSON conversion:", plainData);
      logger.info("Data type:", typeof plainData);

      // Validate the data with our schema
      const result = jsonValueSchema.safeParse(plainData);
      logger.info("Zod validation result:", result.success ? "success" : "failure");

      if (!result.success) {
        logger.error("Validation error:", result.error);
      } else {
        logger.info("Final data:", result.data);
        logger.info("Final data type:", typeof result.data);
        logger.info(
          "Is plain object:",
          result.data instanceof Object &&
            !Array.isArray(result.data) &&
            !(result.data instanceof Date)
        );
      }
    },
    false
  );

  // Validate the data with our schema
  const result = jsonValueSchema.safeParse(JSON.parse(JSON.stringify(data)));

  if (!result.success) {
    throw new Error(`Cannot safely convert to Prisma JSON: ${result.error.message}`);
  }

  return result.data as Prisma.InputJsonValue;
}

/**
 * Safely handles null values for Prisma JSON fields
 * @returns Prisma.JsonNull for null values
 */
export function toNullableJson<T>(data: T | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (data === null) {
    return Prisma.JsonNull;
  }

  return toPrismaJson(data);
}
