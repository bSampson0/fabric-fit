import openai from "@/lib/openai";
import { fileToBase64 } from "@/lib/imageUtils";
import type { FabricEntry } from "@/types";

async function describeImage(
  base64: string,
  mimeType: string,
  userPrompt: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
              detail: "high",
            },
          },
          { type: "text", text: userPrompt },
        ],
      },
    ],
  });
  return response.choices[0].message.content ?? "";
}

export async function runPipeline(
  fabrics: FabricEntry[],
  garmentFile: File
): Promise<{ imageUrl: string; prompt: string }> {
  const garmentB64 = await fileToBase64(garmentFile);
  const fabricB64s = await Promise.all(fabrics.map((f) => fileToBase64(f.file)));

  const [garmentDesc, ...fabricDescs] = await Promise.all([
    describeImage(
      garmentB64,
      garmentFile.type,
      "Describe the garment or outfit in this image for a fashion illustrator: " +
        "the exact type (e.g. A-line midi dress, oversized blazer, wide-leg trousers), " +
        "silhouette, neckline, sleeve type, length, fit, and any structural details " +
        "like pleats, darts, pockets, or lapels. Ignore color — focus only on shape and construction. " +
        "Max 120 words."
    ),
    ...fabrics.map((f, i) =>
      describeImage(
        fabricB64s[i],
        f.file.type,
        "Describe this fabric in precise detail for a fashion designer: " +
          "the exact pattern type (e.g. houndstooth, plaid, floral, abstract), " +
          "all colors and their hex-like descriptions, weave structure (woven/knit/printed), " +
          "texture appearance (matte/shiny/textured), repeat scale, and any notable motifs. " +
          "Be concise but technically precise. Max 150 words."
      )
    ),
  ]);

  const panelDescriptions = fabrics
    .map((f, i) => `The ${f.panel} panels are constructed from: ${fabricDescs[i]}.`)
    .join(" ");

  const prompt =
    `A photorealistic fashion photograph of a garment with distinct fabric panels. ` +
    `${panelDescriptions} ` +
    `The garment is: ${garmentDesc}. ` +
    `Each fabric's texture, pattern, and color should be clearly visible on its respective panel, ` +
    `realistically draped and lit. Clean white studio background. Professional fashion photography.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (openai.images.generate as any)({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned from gpt-image-1");

  return {
    imageUrl: `data:image/png;base64,${b64}`,
    prompt,
  };
}
