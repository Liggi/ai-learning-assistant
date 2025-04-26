import { useState, useCallback } from "react";
import {
  generateImage,
  type GenerateImageInput,
} from "@/features/generators/generate-image";
import { Logger } from "@/lib/logger";

const logger = new Logger({ context: "useGenerateImage", enabled: false });

/**
 * Hook to generate images from text prompts using the server-side OpenAI integration.
 * @returns {
 *  data: Base64 JSON image string or null,
 *  loading: boolean,
 *  error: Error | null,
 *  generate: (input: GenerateImageInput) => Promise<{ b64_json: string }>
 * }
 */
export function useGenerateImage() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (input: GenerateImageInput) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      logger.info("Starting image generation", { prompt: input.prompt });
      const result = await generateImage({ data: input });
      setData(result.b64_json ?? null);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logger.error("Image generation failed", { error: e });
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, generate };
}
