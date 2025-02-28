import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { z } from "zod";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "Anthropic" });

/**
 * Reusable function for handling calls to the Anthropic API with strongly typed responses.
 *
 * @param prompt - The prompt to send to Anthropic.
 * @param schema - A Zod schema that describes the expected response shape.
 *
 * @returns The parsed and validated response from Anthropic.
 *
 * @throws If the response doesn't match the schema or if maximum retries are reached.
 */
export async function callAnthropic<T>(
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const maxRetries = 3;
  let attempt = 0;

  const client = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"],
  });

  while (attempt < maxRetries) {
    try {
      logger.group(`Attempt ${attempt + 1} of ${maxRetries}`, () => {
        logger.info("Starting new API request attempt");
      });
      attempt++;

      logger.debug("Sending request to Anthropic API", { prompt });
      const message = await client.messages.create({
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "claude-3-5-sonnet-latest",
      });

      logger.debug("Received response from Anthropic API", {
        response: message,
      });
      const stringResponse = message.content
        .filter((block): block is TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      logger.group("JSON Parsing", () => {
        logger.debug("Attempting to parse response", { stringResponse });
      });

      let parsedResponse;
      try {
        // First try direct parsing
        parsedResponse = JSON.parse(stringResponse);
      } catch (parseError) {
        logger.warn("Direct parsing failed, attempting to clean response", {
          error: parseError,
        });
        const cleanedResponse = stringResponse
          .replace(/[\n\r]/g, "\\n")
          .replace(/(?<!\\)"/g, '\\"');

        try {
          parsedResponse = JSON.parse(`{"response": "${cleanedResponse}"}`);
          logger.info("Successfully parsed cleaned response");
        } catch (secondError) {
          logger.error("Failed to parse cleaned response", {
            error: secondError,
            cleanedResponse,
          });
          throw parseError;
        }
      }

      // Validate and parse the response using the provided Zod schema
      const result = schema.parse(parsedResponse);
      logger.info("Response passed schema validation");

      return result;
    } catch (err) {
      logger.error(`Attempt ${attempt} failed`, { error: err });
      if (attempt >= maxRetries) {
        logger.error("All attempts failed after maximum retries", {
          maxRetries,
        });
        throw err;
      }
      // Wait 1 second before the next attempt
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // This line should never be reached
  throw new Error("Unreachable: Failed to obtain a valid Anthropic response");
}
