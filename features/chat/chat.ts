import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/start";
import { systemPrompt } from "@/prompts";

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
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
    }) => {
      return data;
    }
  )
  .handler(async ({ data }) => {
    try {
      const client = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"],
      });

      // Construct messages array with history if available
      const messages = data.conversationHistory || [];
      messages.push({
        role: "user",
        content: data.message,
      });

      const message = await client.messages.create({
        messages,
        system: systemPrompt({
          subject: data.subject,
          moduleTitle: data.moduleTitle,
          moduleDescription: data.moduleDescription,
        }),
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
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
      coveredTopics?: string[];
    }) => {
      return data;
    }
  )
  .handler(async ({ data }) => {
    try {
      const client = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"],
      });

      // Extract previous questions from conversation history
      const previousQuestions = data.conversationHistory
        ? data.conversationHistory
            .filter((msg) => msg.role === "user")
            .map((msg) => msg.content.toLowerCase())
        : [];

      // Build context from conversation history
      const conversationContext = data.conversationHistory
        ? "\n\nPrevious conversation:\n" +
          data.conversationHistory
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")
        : "";

      // Add covered topics context
      const topicsContext = data.coveredTopics
        ? "\n\nTopics already covered:\n" + data.coveredTopics.join("\n")
        : "";

      const message = await client.messages.create({
        messages: [
          {
            role: "user",
            content: `Based on the current lesson about ${
              data.moduleTitle
            } (${data.moduleDescription}) and the last message: "${
              data.currentMessage
            }", generate 3-4 brief questions that a student might ask to explore different aspects of this topic.${conversationContext}${topicsContext}

Previous questions asked:
${previousQuestions.map((q) => "- " + q).join("\n")}

Requirements for new questions:
1. Must explore aspects NOT covered by previous questions
2. Should not be semantically similar to any previous question
3. Should build upon the knowledge gained from previous answers
4. Must explore new angles or deeper aspects of the topic
5. Should feel like a natural progression from what's been discussed

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
