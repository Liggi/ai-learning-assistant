import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/start";
import { createSystemPrompt } from "@/lib/anthropic";

export const chat = createServerFn({ method: "POST" })
  .validator((data: { subject: string; message: string }) => {
    return data;
  })
  .handler(async ({ data }) => {
    console.log({ data });
    try {
      const client = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"],
      });

      const message = await client.messages.create({
        messages: [
          {
            role: "user",
            content: data.message,
          },
        ],
        system: createSystemPrompt(data.subject),
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
      });

      const response = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      return { response };
    } catch (err) {
      console.error("Error in chat:", err);
      throw err;
    }
  });
