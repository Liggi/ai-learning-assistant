interface GenerateTooltipPromptVariables {
  concepts: string[];
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
}

export const createTooltipPrompt = ({
  concepts,
  subject,
  moduleTitle,
  moduleDescription,
}: GenerateTooltipPromptVariables): string => {
  const conceptList = concepts.join("\n");
  return `You are helping explain concepts in the context of ${subject}, specifically within the module "${moduleTitle}" which covers: ${moduleDescription}

Create a short digression / expansion on the relevant concept or entity, 1-2 sentences at most, prefer to be concise. Imagine peeking at an answer to someone saying "tell me about that in the context of this module / subject". Return the response in JSON format like {"tooltips": {"concept1": "definition1", "concept2": "definition2"}}.

All concepts must be covered.

Concepts:
${conceptList}`;
};
