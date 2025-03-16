interface GenerateSummaryVariables {
  content: string;
}

export const generateSummaryPrompt = ({
  content,
}: GenerateSummaryVariables) => `You are an expert at creating concise, informative summaries of educational content.
  
  Please create a concise high-level summary for the following article content. Try to keep it less than 15 words.
  Try to capture the essence of the article. You're aiming to optimise for someone skimming a graph of nodes and trying to find
  the specific article content that they are looking for. It will be accompanied by the key takeaways from the article, so you
  don't need to consider that in your summary. It's a concise title statement.
  
  ARTICLE CONTENT:
  ${content.substring(0, 4000)} ${content.length > 4000 ? "..." : ""}
  
  IMPORTANT: You MUST return ONLY a valid JSON object with EXACTLY this structure:
  {
    "summary": "Your concise summary here"
  }
  
  The response MUST contain the "summary" property as a string.
  DO NOT include any explanation, intro text, or anything other than the JSON object itself in your response.`;
