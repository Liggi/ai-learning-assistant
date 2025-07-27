interface GenerateTooltipPromptVariables {
  concepts: string[];
  subject: string;
}

export const createTooltipPrompt = ({
  concepts,
  subject,
}: GenerateTooltipPromptVariables): string => {
  const conceptList = concepts.join("\n");
  return `You are helping explain concepts in the context of learning this subject: (${subject}).
  
  For each concept, create a concise explanation formatted as one or two short paragraphs. Each tooltip should:
  
  1. Start with an ### h3 header that serves as a title for the concept (this can be different from the concept name)
  2. Provide a clear, concise explanation of the concept in the context of this subject
  3. Include why it's important or how it's used in practical applications
  4. Relate it to other relevant concepts when appropriate
  
  Format requirements:
  - Begin each tooltip with an ### h3 header as a title
  - Keep explanations to one or two short paragraphs
  - Use **bold** for important terms or phrases
  - Keep the total length concise but informative
  
  IMPORTANT: Your response MUST be a valid JSON object with the following structure:
  {
    "tooltips": {
      "concept1": "### Concept Title\\n\\nMarkdown formatted explanation...",
      "concept2": "### Another Title\\n\\nMarkdown formatted explanation..."
    }
  }
  
  Do not include any text outside of this JSON structure. The response should be parseable by JSON.parse() without any modifications.
  
  All concepts must be covered.
  
  Concepts:
  ${conceptList}`;
};
