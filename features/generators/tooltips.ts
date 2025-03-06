import { createServerFn } from "@tanstack/start";
import { callAnthropic } from "../llm"; // using the reusable Anthropic caller
import { z } from "zod";
import { createTooltipPrompt } from "@/prompts/chat/tooltips";

// Enable/disable verbose logging
const ENABLE_VERBOSE_LOGGING = false;
const logInfo = (message: string) => {
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(message);
  }
};

// For verbose logging with multiple arguments
const logInfoVerbose = (message: string, data: any) => {
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(message, data);
  }
};

// For logging performance metrics we always want to see
const logMetrics = (message: string) => {
  console.log(message);
};

const tooltipResponseSchema = z.object({
  tooltips: z.record(z.string()),
});

export const generate = createServerFn({ method: "POST" })
  .validator(
    (data: {
      concepts: string[];
      subject: string;
      moduleTitle: string;
      moduleDescription: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const requestId = `tooltip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      // Log the number of concepts and their total length
      const totalConceptsLength = data.concepts.join("").length;
      logInfo(
        `[${requestId}] Tooltip generator called with ${data.concepts.length} concepts, total length: ${totalConceptsLength}`
      );
      logInfoVerbose(
        `[${requestId}] Tooltip generator concepts:`,
        data.concepts
      );

      const prompt = createTooltipPrompt(data);
      logInfo(
        `[${requestId}] Generated tooltip prompt length: ${prompt.length}`
      );
      logInfoVerbose(
        `[${requestId}] Generated tooltip prompt preview:`,
        prompt.substring(0, 200) + "..."
      );

      // Create a timeout promise
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<{ tooltips: Record<string, string> }>(
        (_resolve, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new Error(
                `[${requestId}] Tooltip generation timed out after 45 seconds`
              )
            );
          }, 45000); // 45 second timeout
        }
      );

      try {
        logInfo(`[${requestId}] Calling Anthropic API for tooltip generation`);
        const startTime = Date.now();

        // Race the API call against the timeout
        const resultPromise = callAnthropic(
          prompt,
          tooltipResponseSchema,
          requestId
        );
        const result = await Promise.race([resultPromise, timeoutPromise]);

        // Clear timeout if we got a result
        if (timeoutId) clearTimeout(timeoutId);

        const endTime = Date.now();
        logMetrics(
          `[${requestId}] API timing: ${endTime - startTime}ms for ${data.concepts.length} concepts`
        );

        // If we have very few tooltips compared to concepts, log a warning
        if (Object.keys(result.tooltips).length < data.concepts.length * 0.5) {
          console.warn(
            `[${requestId}] Warning: Received fewer tooltips (${Object.keys(result.tooltips).length}) than expected (${data.concepts.length})`
          );
        }

        return result;
      } catch (error: any) {
        console.error(`[${requestId}] Error in tooltip generation:`, error);
        console.error(
          `[${requestId}] Error name: ${error.name || "unknown"}, message: ${error.message || "no message"}`
        );
        if (error.stack) {
          console.error(`[${requestId}] Error stack: ${error.stack}`);
        }
        // Return empty tooltips object when there's an error
        return { tooltips: {} };
      }
    } catch (err: any) {
      console.error(
        `[${requestId}] Unexpected error in tooltip generation outer block:`,
        err
      );
      return { tooltips: {} };
    }
  });
