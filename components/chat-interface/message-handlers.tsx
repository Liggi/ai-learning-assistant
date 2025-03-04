import { useCallback } from "react";
import { generate as generateSuggestedQuestions } from "@/features/generators/suggested-questions";
import { generate as generateTooltips } from "@/features/generators/tooltips";
import { extractBoldedSegments } from "@/utils/extractBolded";
import { Message, NodeData } from "./types";

export const useMessageHandlers = (
  subject: string,
  node?: NodeData,
  onMessageUpdate?: (message: Message) => void,
  setTooltips?: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setSuggestions?: React.Dispatch<React.SetStateAction<string[]>>,
  setIsSuggestionsLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const generateSuggestions = useCallback(
    async (message: string | null | undefined) => {
      if (!setSuggestions || !setIsSuggestionsLoading || !message) return;

      setSuggestions([]);
      setIsSuggestionsLoading(true);
      try {
        const result = await generateSuggestedQuestions({
          data: {
            subject,
            moduleTitle: node?.label || "",
            moduleDescription: node?.description || "",
            currentMessage: message,
          },
        });
        setSuggestions(result.suggestions);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setIsSuggestionsLoading(false);
      }
    },
    [
      subject,
      node?.label,
      node?.description,
      setSuggestions,
      setIsSuggestionsLoading,
    ]
  );

  const processMessageAndGenerateTooltips = useCallback(
    async (messageText: string) => {
      if (!setTooltips) return;

      const boldedConcepts = extractBoldedSegments(messageText);
      if (boldedConcepts.length) {
        try {
          const tooltipResult = await generateTooltips({
            data: {
              concepts: boldedConcepts,
              subject,
              moduleTitle: node?.label || "",
              moduleDescription: node?.description || "",
            },
          });
          setTooltips((prev) => ({ ...prev, ...tooltipResult.tooltips }));
        } catch (error) {
          // Error handling without logging
        }
      }
    },
    [subject, node?.label, node?.description, setTooltips]
  );

  return {
    generateSuggestions,
    processMessageAndGenerateTooltips,
  };
};
