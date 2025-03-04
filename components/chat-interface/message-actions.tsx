import { useCallback } from "react";
import { generate as generateLesson } from "@/features/generators/lesson";
import { Message, NodeData } from "./types";
import { generateLearningPrompt } from "./utils";

export const useMessageActions = (
  subject: string,
  node: NodeData | undefined,
  activeNodeId: string,
  addMessage: (message: Message) => void,
  setCurrentMessage: React.Dispatch<React.SetStateAction<Message | null>>,
  setActiveNode: (id: string) => void,
  onNewMessage?: (messageId: string) => void,
  processMessageAndGenerateTooltips?: (messageText: string) => Promise<void>,
  generateSuggestions?: (message: string | null | undefined) => Promise<void>,
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const handleMessageUpdate = useCallback(
    (message: Message) => {
      addMessage(message);
      setCurrentMessage(message);
      setActiveNode(message.id ?? "");
      onNewMessage?.(message.id ?? "");
    },
    [addMessage, setCurrentMessage, setActiveNode, onNewMessage]
  );

  const sendInitialMessage = useCallback(async () => {
    if (!node?.label || !setIsLoading) return;

    // Since we know node exists and has label at this point, TypeScript should infer description exists too
    const { label, description } = node;

    setIsLoading(true);
    try {
      const result = await generateLesson({
        data: {
          subject: subject,
          moduleTitle: label,
          moduleDescription: description,
          message:
            "Ignore this message and dive into the topic immediately. No preamble at all, no 'as we were discussing', no 'let's continue'. Nothing. Just dive in.",
        },
      });

      await processMessageAndGenerateTooltips?.(result.response);

      const learningResult = await generateLesson({
        data: {
          subject: subject,
          moduleTitle: label,
          moduleDescription: description,
          message: generateLearningPrompt(result.response),
        },
      });

      let content;
      if (!learningResult.response) {
        content = {
          summary: "Failed to generate learning content",
          takeaways: ["No response was received from the learning system"],
        };
      } else if (typeof learningResult.response === "string") {
        try {
          content = JSON.parse(learningResult.response);
        } catch (error) {
          content = {
            summary: "Failed to parse learning content",
            takeaways: ["Error occurred while processing the response"],
          };
        }
      } else {
        // If it's already an object, use it directly
        content = learningResult.response;
      }

      const message = {
        text: result.response,
        isUser: false,
        id: Date.now().toString(),
        content: {
          summary: content.summary,
          takeaways: content.takeaways,
        },
      };

      handleMessageUpdate(message);
      generateSuggestions?.(result.response);
    } catch (error) {
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        id: Date.now().toString(),
      };
      handleMessageUpdate(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    subject,
    node,
    handleMessageUpdate,
    generateSuggestions,
    processMessageAndGenerateTooltips,
    setIsLoading,
  ]);

  const handleSend = useCallback(
    async (message?: string, input?: string) => {
      if (!node || !setIsLoading) return;

      const userMessage = message || input;
      if (!userMessage || userMessage.trim() === "") return;

      setIsLoading(true);

      // Add user message to conversation
      const userMessageObj = {
        text: userMessage,
        isUser: true,
        id: Date.now().toString(),
        ...(activeNodeId ? { parentId: activeNodeId } : {}),
      };
      addMessage(userMessageObj);

      try {
        const result = await generateLesson({
          data: {
            subject: subject,
            moduleTitle: node.label,
            moduleDescription: node.description,
            message: userMessage,
          },
        });

        await processMessageAndGenerateTooltips?.(result.response);

        // Generate learning content from the response
        const learningResult = await generateLesson({
          data: {
            subject: subject,
            moduleTitle: node.label,
            moduleDescription: node.description,
            message: generateLearningPrompt(result.response),
          },
        });

        // Parse the learning content
        let content;
        if (!learningResult.response) {
          content = {
            summary: "Failed to generate learning content",
            takeaways: ["No response was received from the learning system"],
          };
        } else if (typeof learningResult.response === "string") {
          try {
            content = JSON.parse(learningResult.response);
          } catch (error) {
            content = {
              summary: "Failed to parse learning content",
              takeaways: ["Error occurred while processing the response"],
            };
          }
        } else {
          // If it's already an object, use it directly
          content = learningResult.response;
        }

        const assistantMessage = {
          text: result.response,
          isUser: false,
          id: (Date.now() + 1).toString(),
          parentId: userMessageObj.id,
          content: {
            summary: content.summary,
            takeaways: content.takeaways,
          },
        };
        addMessage(assistantMessage);
        setCurrentMessage(assistantMessage);
        setActiveNode(assistantMessage.id);
        onNewMessage?.(assistantMessage.id);
        generateSuggestions?.(result.response);
      } catch (error) {
        const errorMessage = {
          text: "Sorry, I encountered an error. Please try again.",
          isUser: false,
          id: Date.now().toString(),
          parentId: userMessageObj.id,
        };
        addMessage(errorMessage);
        setCurrentMessage(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      subject,
      node,
      activeNodeId,
      addMessage,
      setCurrentMessage,
      setActiveNode,
      onNewMessage,
      generateSuggestions,
      processMessageAndGenerateTooltips,
      setIsLoading,
    ]
  );

  return {
    handleMessageUpdate,
    sendInitialMessage,
    handleSend,
  };
};
