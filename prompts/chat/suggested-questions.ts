interface GenerateSuggestedQuestionsVariables {
  subject: string;
  moduleTitle: string;
  moduleDescription: string;
  currentMessage: string;
}

export const createPrompt = ({
  subject,
  moduleTitle,
  moduleDescription,
  currentMessage,
}: GenerateSuggestedQuestionsVariables) => `Based on the current lesson about ${moduleTitle} (${moduleDescription}), within the subject: ${subject}, and the last message: "${currentMessage}", generate 3-4 brief questions that a student might ask to explore different aspects of this topic. These should be natural questions that would help the student branch into different areas of learning.

Format them as if the student is asking them, for example: "How does X relate to Y?" or "Can you explain Z in more detail?"

Keep each question under 8 words if possible. Make them feel natural and conversational.

Return your response in this exact JSON format, and only this format:
{"questions": ["question 1", "question 2", "question 3"]}`;
