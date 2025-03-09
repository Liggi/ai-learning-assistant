import { z } from "zod";
import { callAnthropic } from "@/features/llm";
import { createPrompt } from "@/prompts/conversation/node-content";
import { createServerFn } from "@tanstack/start";

// Schema for user message content (just a summary)
const userContentSchema = z.object({
  summary: z.string(),
});

// Schema for AI message content (summary and takeaways)
const aiContentSchema = z.object({
  summary: z.string(),
  takeaways: z.array(z.string()),
});

// Combined schema that can handle either type
const nodeContentSchema = z.union([userContentSchema, aiContentSchema]);

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: {
      text: string;
      isUser: boolean;
      subject: string;
      moduleTitle: string;
    }) => {
      return data;
    }
  )
  .handler(async ({ data }) => {
    const requestId = `node_content_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      console.log(`[${requestId}] Node content generator called with data:`, {
        isUser: data.isUser,
        subject: data.subject,
        moduleTitle: data.moduleTitle,
        textLength: data.text.length,
      });

      const prompt = createPrompt(data);

      console.log(
        `[${requestId}] Calling Anthropic API for node content generation`
      );

      // Use different schema based on whether it's a user or AI message
      if (data.isUser) {
        const response = await callAnthropic(
          prompt,
          userContentSchema,
          requestId
        );
        return { summary: response.summary };
      } else {
        const response = await callAnthropic(
          prompt,
          aiContentSchema,
          requestId
        );
        return { summary: response.summary, takeaways: response.takeaways };
      }
    } catch (err) {
      console.error(`[${requestId}] Error generating node content:`, err);
      throw err;
    }
  });

// Function for client-side use that returns a serializable result
export async function generateNodeContent(data: {
  text: string;
  isUser: boolean;
  subject: string;
  moduleTitle: string;
}): Promise<{ summary: string; takeaways?: string[] }> {
  try {
    const response = await fetch("/api/node-content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to generate node content:", error);
    // Provide a fallback
    return {
      summary:
        data.text.substring(0, 100) + (data.text.length > 100 ? "..." : ""),
      takeaways: data.isUser ? undefined : ["Unable to generate takeaways"],
    };
  }
}
