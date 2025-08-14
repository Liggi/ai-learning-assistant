import { ArrowRight } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useCreateArticleFromQuestion } from "@/hooks/api/articles";
import { Logger } from "@/lib/logger";
import type { SerializedArticle } from "@/types/serialized";

const logger = new Logger({ context: "CustomQuestionInput", enabled: false });

interface CustomQuestionInputProps {
  activeArticle: SerializedArticle | null | undefined;
  onArticleCreated: (articleId: string) => void;
  onQuestionCreated?: (questionText: string, parentArticleId: string) => void;
}

export const CustomQuestionInput: React.FC<CustomQuestionInputProps> = ({
  activeArticle,
  onArticleCreated,
  onQuestionCreated,
}) => {
  const [questionText, setQuestionText] = useState("");
  const createArticleMutation = useCreateArticleFromQuestion();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!questionText.trim() || !activeArticle || createArticleMutation.isPending) {
      return;
    }

    logger.info("Attempting to create article from custom question", {
      question: questionText,
      learningMapId: activeArticle.learningMapId,
      parentArticleId: activeArticle.id,
    });

    if (onQuestionCreated) {
      onQuestionCreated(questionText.trim(), activeArticle.id);
    }

    createArticleMutation.mutate(
      {
        learningMapId: activeArticle.learningMapId,
        parentArticleId: activeArticle.id,
        questionText: questionText.trim(),
      },
      {
        onSuccess: (data) => {
          logger.info("Successfully created article from custom question:", data);
          setQuestionText(""); // Clear input on success
          onArticleCreated(data.id);
        },
        onError: (error) => {
          logger.error("Failed to create article from custom question:", error);
          // Optionally display the error message to the user
        },
      }
    );
  };

  const isDisabled = !activeArticle || createArticleMutation.isPending;
  const canSubmit = !isDisabled && questionText.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="relative flex items-center">
        <Input
          type="text"
          placeholder="Ask a follow-up question..."
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          disabled={isDisabled}
          className="flex-1 pr-10"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors 
                      ${
                        canSubmit
                          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                          : "text-slate-600 cursor-not-allowed"
                      }`}
          aria-label="Submit question"
        >
          {createArticleMutation.isPending ? (
            <svg
              className="animate-spin h-4 w-4 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Creating article..."
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <ArrowRight size={16} />
          )}
        </button>
      </div>

      {createArticleMutation.isError && (
        <p className="text-red-500 text-sm">Error: {createArticleMutation.error.message}</p>
      )}
    </form>
  );
};

export default CustomQuestionInput;
