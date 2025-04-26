import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { OpenAIProvider } from "../openai";

const generateImageInput = z.object({
  prompt: z.string().min(1),
  size: z
    .enum(["square", "landscape", "portrait", "auto"])
    .default("landscape"),
});

export type GenerateImageInput = z.infer<typeof generateImageInput>;

export const generateImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateImageInput.parse(data))
  .handler(async ({ data }) => {
    const { prompt, size } = data as GenerateImageInput;
    const provider = new OpenAIProvider();

    const result = await provider.generateImages({
      prompt,
      size,
    });

    const image = result[0];

    return image.b64_json ? { b64_json: image.b64_json } : { url: image.url };
  });
