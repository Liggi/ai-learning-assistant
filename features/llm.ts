import Anthropic from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/src/resources/messages/messages.js";
import { z } from "zod";

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
      console.log(`\n🔄 Attempt ${attempt + 1} of ${maxRetries}`);
      attempt++;

      console.log("📤 Sending request to Anthropic API...");
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

      console.log("📥 Received response from Anthropic API");
      const stringResponse = message.content
        .filter((block): block is TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      console.log("\n🔍 Attempting to parse JSON...");
      const parsedResponse = JSON.parse(stringResponse);

      // Validate and parse the response using the provided Zod schema.
      const result = schema.parse(parsedResponse);
      console.log("✅ Response passed validation!");

      return result;
    } catch (err) {
      console.error(`\n❌ Attempt ${attempt} failed with error:`, err);
      if (attempt >= maxRetries) {
        console.error("\n💥 All attempts failed after maximum retries");
        throw err;
      }
      // Wait 1 second before the next attempt.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // This line should never be reached.
  throw new Error("Unreachable: Failed to obtain a valid Anthropic response");
}
