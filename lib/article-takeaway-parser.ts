import { Logger } from "@/lib/logger";

// Create a logger instance for the takeaway parser
const logger = new Logger({ context: "ArticleTakeawayParser", enabled: true });

/**
 * Extracts takeaways from article content based on the expected format
 * from the lesson prompt (blockquote with bullet points at the end)
 */
export function extractTakeaways(content: string): string[] {
  // Look for blockquote section at the end of the content
  const blockquoteRegex = />[\s\S]*$/;
  const blockquoteMatch = content.match(blockquoteRegex);

  if (!blockquoteMatch) {
    return [];
  }

  const blockquoteContent = blockquoteMatch[0];

  // Split the blockquote content by lines and process each line
  const lines = blockquoteContent.split("\n");
  const takeaways: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Look for lines that start with '>' and contain a dash
    if (trimmedLine.startsWith(">") && trimmedLine.includes("-")) {
      const bulletMatch = trimmedLine.match(/>\s*-\s*(.*)/);
      if (bulletMatch && bulletMatch[1]) {
        const takeaway = bulletMatch[1].trim();
        takeaways.push(takeaway);
      }
    }
  }

  return takeaways;
}

/**
 * Extracts a summary from the article content
 * For now, this just takes the first paragraph as a simple approach
 */
export function extractSummary(content: string): string {
  logger.group("Extracting summary from content", () => {
    logger.debug(`Content length: ${content.length} characters`);

    // Log the first 500 characters where we expect to find the summary
    const firstPortion = content.slice(0, 500);
    logger.debug("First portion of content:", firstPortion);
  });

  // Simple approach: take the first paragraph that's not a heading
  const paragraphs = content.split("\n\n");

  logger.debug(`Split content into ${paragraphs.length} paragraphs`);

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    logger.debug(
      `Paragraph ${i + 1}: "${paragraph.substring(0, 100)}${paragraph.length > 100 ? "..." : ""}"`
    );

    // Skip headings and empty paragraphs
    if (!paragraph.startsWith("#") && paragraph.trim().length > 0) {
      // Limit to a reasonable length for a summary
      const summary =
        paragraph.trim().substring(0, 150) +
        (paragraph.length > 150 ? "..." : "");

      logger.info(`Extracted summary: "${summary}"`);
      return summary;
    }
  }

  logger.warn("No suitable paragraph found for summary");
  return "";
}
