interface GenerateNodeContentVariables {
  text: string;
  isUser: boolean;
  subject: string;
  moduleTitle: string;
}

export const createPrompt = ({
  text,
  isUser,
  subject,
  moduleTitle,
}: GenerateNodeContentVariables) => {
  if (isUser) {
    return `Given the following user message in a learning conversation about ${subject}, specifically on the topic of ${moduleTitle}, create a brief summary of the question or comment.

User message: "${text}"

Return your response in this exact JSON format:
{
  "summary": "Brief summary of the question/comment (max 100 characters)"
}`;
  } else {
    return `Given the following AI teaching response in a conversation about ${subject}, specifically on the topic of ${moduleTitle}, extract the key points and create a concise summary.

AI response: """
${text}
"""

Create a summary and extract 3-5 key takeaways from this response that capture the most important concepts or insights.

Return your response in this exact JSON format:
{
  "summary": "Brief summary of the response (max 100 characters)",
  "takeaways": [
    "First key point",
    "Second key point",
    "Third key point"
    // Additional points if needed
  ]
}`;
  }
};
