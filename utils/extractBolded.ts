export function extractBoldedSegments(markdownText: string): string[] {
  // Match **something** (two asterisks)
  // Use a regex capturing group to get everything between the **
  const boldRegex = /\*\*(.+?)\*\*/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(markdownText)) !== null) {
    const captured = match[1].trim();
    if (!matches.includes(captured)) {
      matches.push(captured);
    }
  }
  return matches;
}
