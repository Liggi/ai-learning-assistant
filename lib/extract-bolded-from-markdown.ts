export default function extractConcepts(text: string): string[] {
  if (!text) return [];

  // Look for bold text (markdown ** or __)
  const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g;
  const matches = [...text.matchAll(boldRegex)];

  // Extract the bolded text and remove duplicates
  const concepts = matches
    .map((match) => (match[1] || match[2]).trim())
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);

  return concepts;
}
