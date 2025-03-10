# Implementation Plan for Suggested Questions

## Overview

This document outlines the implementation plan for adding "suggested questions" to the chat UI. These questions will be generated in parallel with tooltips and shown at the end of the content, with their own loading state.

## Requirements

1. Generate suggested questions in parallel with tooltips
2. Display suggested questions at the end of the content
3. Show a loading state separate from "Generating tooltips" but stylistically similar
4. Animate the suggested questions section and each question individually similar to knowledge calibration pills

## Implementation Steps

### 1. Create a Custom Hook for Suggested Questions

Create a new custom hook called `useSuggestedQuestions` in `hooks/use-suggested-questions.ts` that will:

- Accept parameters similar to `useTooltipGeneration` (content, isStreamingComplete, subject, moduleTitle, moduleDescription)
- Use the existing `suggested-questions.ts` generator
- Return the suggested questions, loading state, and ready state

```typescript
// hooks/use-suggested-questions.ts
import { useState, useEffect } from "react";
import { generate as generateSuggestedQuestions } from "@/features/generators/suggested-questions";

interface SuggestedQuestionsParams {
  content: string;
  isStreamingComplete: boolean;
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export function useSuggestedQuestions({
  content,
  isStreamingComplete,
  subject,
  moduleTitle,
  moduleDescription,
}: SuggestedQuestionsParams) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] =
    useState<boolean>(false);
  const [questionsReady, setQuestionsReady] = useState<boolean>(false);

  useEffect(() => {
    if (
      isStreamingComplete &&
      !isGeneratingQuestions &&
      !questionsReady &&
      content
    ) {
      const generateQuestionsForContent = async () => {
        try {
          setIsGeneratingQuestions(true);

          const suggestionsResult = await generateSuggestedQuestions({
            data: {
              subject,
              moduleTitle,
              moduleDescription,
              currentMessage: content,
            },
          });

          setQuestions(suggestionsResult.suggestions);
          setQuestionsReady(true);
        } catch (error) {
          console.error("Error generating suggested questions:", error);
        } finally {
          setIsGeneratingQuestions(false);
        }
      };

      generateQuestionsForContent();
    }
  }, [
    isStreamingComplete,
    content,
    subject,
    moduleTitle,
    moduleDescription,
    isGeneratingQuestions,
    questionsReady,
  ]);

  const resetQuestions = () => {
    setQuestions([]);
    setQuestionsReady(false);
  };

  return {
    questions,
    isGeneratingQuestions,
    questionsReady,
    resetQuestions,
  };
}
```

### 2. Create a Suggested Questions Component

Create a new component called `SuggestedQuestions` that will:

- Display the suggested questions
- Handle the animation of each question
- Handle the loading state

```typescript
// components/suggested-questions.tsx
import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  questions: string[];
  isLoading: boolean;
  isReady: boolean;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  isLoading,
  isReady,
}) => {
  // Animation variants for container
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  // Animation variants for questions
  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400 mt-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={14} />
        </motion.div>
        <span>Generating questions...</span>
      </div>
    );
  }

  if (!isReady || questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-3">Explore further:</h3>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-wrap gap-2"
      >
        {questions.map((question, index) => (
          <motion.button
            key={index}
            variants={item}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-sm transition-colors"
          >
            {question}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};
```

### 3. Update ChatLayout to Use the New Hook and Component

Update `components/chat-layout.tsx` to:

- Import and use the `useSuggestedQuestions` hook
- Pass the suggested questions to the `MarkdownDisplay` component
- Show loading states for both tooltips and suggested questions

```typescript
// Modified parts of components/chat-layout.tsx
import { useSuggestedQuestions } from "@/hooks/use-suggested-questions";
import { SuggestedQuestions } from "./suggested-questions";

// Inside ChatLayout component
const { questions, isGeneratingQuestions, questionsReady, resetQuestions } =
  useSuggestedQuestions({
    content,
    isStreamingComplete,
    subject: moduleDetails.subject,
    moduleTitle: moduleDetails.moduleTitle,
    moduleDescription: moduleDetails.moduleDescription,
  });

// In the JSX part where the loading indicators are shown
<div className="flex items-center space-x-4">
  {isGeneratingTooltips && (
    <div className="flex items-center space-x-2 text-sm text-gray-400">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles size={14} />
      </motion.div>
      <span>Generating tooltips...</span>
    </div>
  )}
  {isGeneratingQuestions && (
    <div className="flex items-center space-x-2 text-sm text-gray-400">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles size={14} />
      </motion.div>
      <span>Generating questions...</span>
    </div>
  )}
</div>

// After MarkdownDisplay
<SuggestedQuestions
  questions={questions}
  isLoading={isGeneratingQuestions}
  isReady={questionsReady}
/>
```

### 4. Update MarkdownDisplay if Needed

If we decide to include suggested questions within the markdown display instead of as a separate component after it, we would need to update `MarkdownDisplay` to:

- Accept the suggested questions as props
- Render them at the end of the content

### 5. Add Click Handling for Suggested Questions

Implement functionality to handle what happens when a user clicks on a suggested question:

- Send the question to the backend as a user message
- This will require wiring up event handlers and integrating with the existing chat functionality

## Testing Plan

1. Verify that suggested questions are generated in parallel with tooltips
2. Verify that the loading state is displayed correctly
3. Verify that the questions animate in properly
4. Verify that clicking on a question sends it as a user message

## Design Considerations

- The suggested questions should be visually distinct from the lesson content
- The animation should be subtle and not distracting
- The loading state should be consistent with the tooltip loading state

## Implementation Timeline

1. Create the `useSuggestedQuestions` hook
2. Create the `SuggestedQuestions` component
3. Update `ChatLayout` to use the new hook and component
4. Test the implementation
5. Handle click events on suggested questions

## Open Questions

1. Should suggested questions be rendered within the MarkdownDisplay component or as a separate component after it?
2. What should happen when a user clicks on a suggested question? Should it immediately send the question or should there be a confirmation step?
3. Should we reset suggested questions when the content changes or on refresh?
