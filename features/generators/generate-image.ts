import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { OpenAIProvider } from "../openai";

const generateImageInput = z.object({
  prompt: z.string().min(1),
  size: z
    .enum(["square", "landscape", "portrait", "auto"])
    .default("landscape"),
  response_format: z.enum(["url", "b64_json"]).default("b64_json"),
});

type GenerateImageInput = z.infer<typeof generateImageInput>;

export const generateImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => generateImageInput.parse(data))
  .handler(async ({ data }) => {
    const { prompt, size, response_format } = data as GenerateImageInput;
    const provider = new OpenAIProvider();

    const result = await provider.generateImages({
      prompt,
      n: 1,
      size,
      response_format,
    });

    const image = result[0];

    return { b64_json: image.b64_json };
  });
