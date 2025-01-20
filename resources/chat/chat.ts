import Anthropic from "@anthropic-ai/sdk";
import { createServerFn } from "@tanstack/start";
import { createSystemPrompt } from "@/lib/anthropic";
import { create } from "zustand";
import { Node, Edge } from "@xyflow/react";

interface Message {
  id: string;
  text: string;
  summary: string;
  isUser: boolean;
  parentId?: string;
}

interface ConversationState {
  nodes: Node[];
  edges: Edge[];
  messages: Message[];
  activeNodeId: string | null;
  addMessageToFlow: (newMessage: Message, explicitParentId?: string) => void;
  repositionNodes: () => void;
  setActiveNode: (nodeId: string) => void;
}

// Calculate actual tree depth for a message
const getMessageDepth = (
  messages: Message[],
  messageId: string,
  depth = 0
): number => {
  const message = messages.find((m) => m.id === messageId);
  if (!message || !message.parentId) return depth;
  return getMessageDepth(messages, message.parentId, depth + 1);
};

// Shared function for generating summaries using Claude
const generateSummaryWithClaude = async (
  client: Anthropic,
  text: string,
  isUser: boolean
): Promise<string> => {
  const message = await client.messages.create({
    messages: [
      {
        role: "user",
        content: `Given this ${isUser ? "question" : "explanation"}: "${text}"

Create a very concise (max 6-8 words) summary that captures the key concept being discussed. 
If it's a question, phrase it as a question.
If it's an explanation, focus on the main concept being explained.
Don't use ellipsis.
Don't start with phrases like "Explaining" or "Understanding".
Just state the core concept directly.`,
      },
    ],
    model: "claude-3-sonnet-20240229",
    max_tokens: 50,
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
};

export const generateMessageSummary = createServerFn({ method: "POST" })
  .validator((data: { text: string; isUser: boolean }) => {
    return data;
  })
  .handler(async ({ data }) => {
    try {
      const client = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"],
      });

      const summary = await generateSummaryWithClaude(
        client,
        data.text,
        data.isUser
      );

      return { summary };
    } catch (err) {
      console.error("Error generating summary:", err);
      throw err;
    }
  });

export const getConceptualLayout = createServerFn({ method: "POST" })
  .validator((data: { messages: Message[] }) => {
    return data;
  })
  .handler(async ({ data }) => {
    const maxRetries = 3;
    let attempt = 0;
    let result;

    // Extract just the essential data for layout
    const messageStructure = data.messages.map((msg) => ({
      id: msg.id,
      summary: msg.summary,
      isUser: msg.isUser,
      parentId: msg.parentId,
    }));

    console.log(
      "Layout input structure:",
      JSON.stringify(messageStructure, null, 2)
    );

    while (attempt < maxRetries) {
      try {
        console.log(
          `\n🔄 Layout generation attempt ${attempt + 1} of ${maxRetries}`
        );
        attempt++;

        const client = new Anthropic({
          apiKey: process.env["ANTHROPIC_API_KEY"],
        });

        const message = await client.messages.create({
          messages: [
            {
              role: "user",
              content: `You are a graph layout generator. Given this conversation data:
${JSON.stringify(messageStructure, null, 2)}

Your task is to generate a graph visualization structure. The rules are:
1. First message at top center (x: ~450, y: 50)
2. Each new branch starts at a new x position
3. Answers positioned below their questions
4. Questions from same parent spaced horizontally
5. Questions and their answers closer together than unrelated nodes
6. x values: 100-800, y values: 50+ with ~100px increments
7. Questions and answers share similar x coordinates

RESPOND WITH ONLY A VALID JSON OBJECT containing "nodes" and "edges" arrays. No other text.

Required format:
{
  "nodes": [
    {
      "id": "msg1",
      "type": "conversationNode",
      "position": { "x": 450, "y": 50 },
      "data": { "id": "msg1", "summary": "Initial concept", "isUser": false }
    }
  ],
  "edges": [
    {
      "id": "edge-msg1-msg2",
      "source": "msg1",
      "target": "msg2",
      "type": "smoothstep",
      "style": {
        "stroke": "rgba(148, 163, 184, 0.2)",
        "strokeWidth": 2,
        "strokeDasharray": "5 5"
      },
      "animated": true
    }
  ]
}`,
            },
          ],
          model: "claude-3-sonnet-20240229",
          max_tokens: 4096,
        });

        const response = message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("")
          .trim();

        // Remove any potential markdown code block markers
        const cleanJson = response.replace(/^```json\n|\n```$/g, "").trim();

        try {
          result = JSON.parse(cleanJson);
        } catch (parseError) {
          console.error("Failed to parse response:", cleanJson);
          throw new Error("Invalid JSON response from layout generator");
        }

        // Validate the response structure
        if (!result?.nodes?.length || !Array.isArray(result.nodes)) {
          throw new Error("Invalid nodes array in response");
        }
        if (!Array.isArray(result.edges)) {
          throw new Error("Invalid edges array in response");
        }

        // Validate that all required nodes exist and have correct structure
        const nodeIds = new Set(result.nodes.map((n) => n.id));
        if (!messageStructure.every((msg) => nodeIds.has(msg.id))) {
          throw new Error("Some messages are missing from the generated nodes");
        }

        // Validate node structure
        if (
          !result.nodes.every(
            (node) =>
              node.type === "conversationNode" &&
              typeof node.position?.x === "number" &&
              typeof node.position?.y === "number" &&
              node.data?.id &&
              typeof node.data?.summary === "string" &&
              typeof node.data?.isUser === "boolean"
          )
        ) {
          throw new Error("Invalid node structure in response");
        }

        // Validate edge structure
        if (
          !result.edges.every(
            (edge) =>
              edge.source &&
              edge.target &&
              edge.type === "smoothstep" &&
              edge.style?.stroke &&
              edge.style?.strokeWidth &&
              edge.style?.strokeDasharray &&
              edge.animated === true
          )
        ) {
          throw new Error("Invalid edge structure in response");
        }

        console.log(
          "Generated graph structure:",
          JSON.stringify(result, null, 2)
        );
        break;
      } catch (err) {
        console.error(`\n❌ Attempt ${attempt} failed with error:`, err);
        if (attempt >= maxRetries) {
          console.error("\n💥 All attempts failed after maximum retries");
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return result;
  });

export const useConversationStore = create<ConversationState>((set, get) => ({
  nodes: [],
  edges: [],
  messages: [],
  activeNodeId: null,
  setActiveNode: (nodeId: string) => {
    console.log("Setting active node:", nodeId);
    set({ activeNodeId: nodeId });
  },
  repositionNodes: async () => {
    console.log("repositionNodes called");
    const state = get();
    console.log("Current state:", {
      messageCount: state.messages.length,
      nodeCount: state.nodes.length,
      edgeCount: state.edges.length,
      activeNodeId: state.activeNodeId,
      messages: state.messages,
    });

    try {
      const result = await getConceptualLayout({
        data: {
          messages: state.messages,
        },
      });

      if (!result || !result.nodes || !result.edges) {
        console.error("Invalid result from getConceptualLayout");
        return;
      }

      console.log("Setting new graph structure:", result);

      // Update the entire graph structure
      set({
        nodes: result.nodes,
        edges: result.edges,
      });
    } catch (err) {
      console.error("Error repositioning nodes:", err);
      throw err;
    }
  },
  addMessageToFlow: (newMessage: Message, explicitParentId?: string) => {
    set((state) => {
      // Determine the parent based on conversation flow
      let parentId: string | undefined;

      if (state.messages.length === 0) {
        // First message has no parent
        parentId = undefined;
      } else if (explicitParentId) {
        // If explicitly provided, use that
        parentId = explicitParentId;
      } else if (state.activeNodeId) {
        // If a node is selected, use that
        parentId = state.activeNodeId;
      } else {
        // Otherwise, connect to the last message in the conversation
        parentId = state.messages[state.messages.length - 1].id;
      }

      console.log("Adding message with:", {
        messageId: newMessage.id,
        parentId,
        activeNodeId: state.activeNodeId,
        explicitParentId,
        isFirstMessage: state.messages.length === 0,
        isUser: newMessage.isUser,
      });

      const messageWithParent: Message = {
        ...newMessage,
        parentId,
      };

      console.log("Created message with parent:", messageWithParent);

      // Just add the message to the state, repositionNodes will handle the layout
      const newState: Partial<ConversationState> = {
        messages: [...state.messages, messageWithParent],
      };

      // Schedule reposition with a slight delay to ensure state is updated
      Promise.resolve().then(() => {
        console.log("Executing repositionNodes");
        get().repositionNodes();
      });

      return newState;
    });
  },
}));

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
