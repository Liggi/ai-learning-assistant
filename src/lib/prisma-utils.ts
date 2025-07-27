/**
 * Safely converts a Prisma JSON field to a plain JavaScript object
 * @param jsonField The Prisma JSON field to convert
 * @param defaultValue Optional default value if the field is null/undefined
 * @returns A plain JavaScript object
 */
export function fromPrismaJson<T = Record<string, any>>(
  jsonField: any,
  defaultValue: T = {} as T
): T {
  if (!jsonField) {
    return defaultValue;
  }

  // If it's already a plain object, return it
  if (typeof jsonField === "object" && jsonField !== null) {
    return jsonField as T;
  }

  // Otherwise, try to parse it
  try {
    return JSON.parse(JSON.stringify(jsonField)) as T;
  } catch (error) {
    console.error("Error parsing Prisma JSON field:", error);
    return defaultValue;
  }
}
