import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, interpolatePrompt } from "../prompts";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const createSystemPrompt = (
  subject: string,
  moduleTitle: string,
  moduleDescription: string
) => {
  return interpolatePrompt(SYSTEM_PROMPT, {
    subject,
    moduleTitle,
    moduleDescription,
  });
};
