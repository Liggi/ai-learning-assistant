import { z } from "zod";

// ContextualTooltip schema
export const contextualTooltipSchema = z.object({
  id: z.string(),
  term: z.string(),
  explanation: z.string(),
  articleId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ContextualTooltip = z.infer<typeof contextualTooltipSchema>;

// For batch processing of tooltips
export const tooltipBatchSchema = z.array(
  z.object({
    term: z.string(),
    explanation: z.string(),
  })
);

export type TooltipBatch = z.infer<typeof tooltipBatchSchema>;

// For storing tooltips in a map
export const tooltipsMapSchema = z.record(z.string(), z.string());
export type TooltipsMap = z.infer<typeof tooltipsMapSchema>;
