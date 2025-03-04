import { generate as generateLesson } from "@/features/generators/lesson";
import { generate as generateSuggestions } from "@/features/generators/suggested-questions";
import { generate as generateTooltips } from "@/features/generators/tooltips";
import { extractBoldedSegments } from "@/utils/extractBolded";
import { generateLearningPrompt } from "./utils";

export interface Message {
  text: string;
  isUser: boolean;
  id?: string;
  parentId?: string;
  content?: {
    summary: string;
    takeaways: string[];
  };
}

export interface NodeData {
  id?: string;
  label: string;
  description: string;
  status?: "not-started" | "in-progress" | "completed";
  progress?: number;
}

export class ChatService {
  async sendMessage(options: {
    message: string;
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
    parentId?: string;
  }) {
    const { message, subject, moduleTitle, moduleDescription, parentId } =
      options;

    try {
      // Generate response
      const result = await generateLesson({
        data: { subject, moduleTitle, moduleDescription, message },
      });

      // Process for tooltips
      const tooltips = await this.generateTooltips({
        messageText: result.response,
        subject,
        moduleTitle,
        moduleDescription,
      });

      // Generate learning content
      const learningContent = await this.generateLearningContent({
        response: result.response,
        subject,
        moduleTitle,
        moduleDescription,
      });

      // Create message objects
      const userMessage = {
        text: message,
        isUser: true,
        id: Date.now().toString(),
        parentId,
      };

      const assistantMessage = {
        text: result.response,
        isUser: false,
        id: (Date.now() + 1).toString(),
        parentId: userMessage.id,
        content: learningContent,
      };

      return {
        userMessage,
        assistantMessage,
        tooltips,
      };
    } catch (error) {
      console.error("Error sending message:", error);

      // Standard error handling
      const userMessage = {
        text: message,
        isUser: true,
        id: Date.now().toString(),
        parentId,
      };

      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        id: (Date.now() + 1).toString(),
        parentId: userMessage.id,
      };

      return {
        userMessage,
        assistantMessage: errorMessage,
        tooltips: {},
      };
    }
  }

  async sendInitialMessage(options: {
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
  }) {
    const { subject, moduleTitle, moduleDescription } = options;

    try {
      const result = await generateLesson({
        data: {
          subject,
          moduleTitle,
          moduleDescription,
          message:
            "Ignore this message and dive into the topic immediately. No preamble at all, no 'as we were discussing', no 'let's continue'. Nothing. Just dive in.",
        },
      });

      // Process for tooltips
      const tooltips = await this.generateTooltips({
        messageText: result.response,
        subject,
        moduleTitle,
        moduleDescription,
      });

      // Generate learning content
      const learningContent = await this.generateLearningContent({
        response: result.response,
        subject,
        moduleTitle,
        moduleDescription,
      });

      const assistantMessage = {
        text: result.response,
        isUser: false,
        id: Date.now().toString(),
        content: learningContent,
      };

      return {
        assistantMessage,
        tooltips,
      };
    } catch (error) {
      console.error("Error sending initial message:", error);

      const errorMessage = {
        text: "Sorry, I encountered an error generating the initial content. Please try again.",
        isUser: false,
        id: Date.now().toString(),
      };

      return {
        assistantMessage: errorMessage,
        tooltips: {},
      };
    }
  }

  async generateSuggestions(options: {
    text: string;
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
  }) {
    const { text, subject, moduleTitle, moduleDescription } = options;

    try {
      const result = await generateSuggestions({
        data: {
          subject,
          moduleTitle,
          moduleDescription,
          currentMessage: text,
        },
      });

      return { suggestions: result.suggestions };
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return { suggestions: [] };
    }
  }

  async generateTooltips(options: {
    messageText: string;
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
  }) {
    const { messageText, subject, moduleTitle, moduleDescription } = options;

    const boldedConcepts = extractBoldedSegments(messageText);
    if (!boldedConcepts.length) {
      return {};
    }

    try {
      const result = await generateTooltips({
        data: {
          concepts: boldedConcepts,
          subject,
          moduleTitle,
          moduleDescription,
        },
      });

      return result.tooltips;
    } catch (error) {
      console.error("Error generating tooltips:", error);
      return {};
    }
  }

  async generateLearningContent(options: {
    response: string;
    subject: string;
    moduleTitle: string;
    moduleDescription: string;
  }) {
    const { response } = options;

    try {
      const learningResult = await generateLesson({
        data: {
          subject: options.subject,
          moduleTitle: options.moduleTitle,
          moduleDescription: options.moduleDescription,
          message: generateLearningPrompt(response),
        },
      });

      if (!learningResult.response) {
        return {
          summary: "Failed to generate learning content",
          takeaways: ["No response was received from the learning system"],
        };
      }

      if (typeof learningResult.response === "string") {
        try {
          return JSON.parse(learningResult.response);
        } catch (error) {
          return {
            summary: "Failed to parse learning content",
            takeaways: ["Error occurred while processing the response"],
          };
        }
      }

      // If it's already an object, use it directly
      return learningResult.response;
    } catch (error) {
      console.error("Error generating learning content:", error);
      return {
        summary: "Error generating learning content",
        takeaways: ["An unexpected error occurred"],
      };
    }
  }
}

// Create a singleton instance
export const chatService = new ChatService();
