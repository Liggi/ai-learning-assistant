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

export const generateSuggestionPills = createServerFn({ method: "POST" })
  .validator(
    (data: {
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
      currentMessage: string;
    }) => {
      return data;
    }
  )
  .handler(async ({ data }) => {
    try {
      const client = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"],
      });

      const message = await client.messages.create({
        messages: [
          {
            role: "user",
            content: `Based on the current lesson about ${data.moduleTitle} (${data.moduleDescription}) and the last message: "${data.currentMessage}", generate 3-4 brief questions that a student might ask to explore different aspects of this topic. These should be natural questions that would help the student branch into different areas of learning.

Format them as if the student is asking them, for example: "How does X relate to Y?" or "Can you explain Z in more detail?"

Keep each question under 8 words if possible. Make them feel natural and conversational.

Return your response in this exact JSON format, and only this format:
{"questions": ["question 1", "question 2", "question 3"]}`,
          },
        ],
        model: "claude-3-sonnet-20240229",
        max_tokens: 1024,
      });

      const jsonContent = JSON.parse(
        message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("")
      );

      return { suggestions: jsonContent.questions };
    } catch (err) {
      console.error("Error generating suggestions:", err);
      throw err;
    }
  });
