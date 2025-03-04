export const generateLearningPrompt = (text: string) => {
  return `Please take the following text about ${text} and produce the following:

A concise, short sentence (10 words or less) capturing the essence of the idea(s) being taught.
Several short statements or 'takeaways' highlighting the main points, each on its own line.
Keep it factual, clear, and succinct. Avoid unnecessary details or overly friendly tone. Focus on the key concepts.

Return the response in this exact JSON format:
{
  "summary": "The high level summary goes here",
  "takeaways": [
    "First takeaway",
    "Second takeaway",
    "etc..."
  ]
}

Here's the text to analyze:

${text}`;
};
