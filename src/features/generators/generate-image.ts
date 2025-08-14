import { createServerFn } from "@tanstack/react-start";
import OpenAI from "openai";
import { z } from "zod";
import { robustLLMCall } from "@/lib/robust-llm-call";

const generateImageInput = z.object({
  prompt: z.string().min(1),
  size: z.enum(["square", "landscape", "portrait", "auto"]).default("landscape"),
  response_format: z.enum(["url", "b64_json"]).default("b64_json"),
});

type GenerateImageInput = z.infer<typeof generateImageInput>;

export const generateImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateImageInput.parse(data))
  .handler(async ({ data }) => {
    const { prompt, size, response_format } = data as GenerateImageInput;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: "https://oai.helicone.ai/v1",
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-Type": "image",
      },
    });

    const sizeMap = {
      square: "1024x1024",
      landscape: "1792x1024",
      portrait: "1024x1792",
    } as const;

    const sizeParam = size && size !== "auto" ? sizeMap[size as keyof typeof sizeMap] : undefined;

    const response = await robustLLMCall<{ data: Array<{ url?: string; b64_json?: string }> }>(
      () =>
        openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: sizeParam,
          response_format,
        }),
      {
        provider: "openai",
        requestType: "image-generation",
        metadata: {
          promptLength: prompt.length,
          size: sizeParam,
        },
      }
    );

    const image = response.data[0];

    return { b64_json: image.b64_json };
  });
