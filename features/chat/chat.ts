import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/start";
import { createSystemPrompt } from "@/lib/anthropic";

const stripResponsePlanning = (text: string): string => {
  return text
    .replace(/<response_planning>[\s\S]*?<\/response_planning>/g, "")
    .trim();
};

export const chat = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
      message: string;
    }) => {
      return data;
    }
  )
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
        system: createSystemPrompt(
          data.subject,
          data.moduleTitle,
          data.moduleDescription
        ),
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
      });

      const response = stripResponsePlanning(
        message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("")
      );

      return { response };
    } catch (err) {
      console.error("Error in chat:", err);
      throw err;
    }
  });
