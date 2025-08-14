export function extractBoldedSegments(markdownText: string): string[] {
  // Match **something** (two asterisks)
  // Use a regex capturing group to get everything between the **
  const boldRegex = /\*\*(.+?)\*\*/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  match = boldRegex.exec(markdownText);
  while (match !== null) {
    const captured = match[1].trim();
    if (!matches.includes(captured)) {
      matches.push(captured);
    }
    match = boldRegex.exec(markdownText);
  }
  return matches;
}
