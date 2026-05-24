import openai from "../openai";
import { webFileToOpenAIFile } from "../imageUtils";
import type { FabricEntry } from "@/types";

export async function runSingleStep(
  fabrics: FabricEntry[],
  garmentFile: File
): Promise<string> {
  const fabricOAIFiles = await Promise.all(
    fabrics.map((f, i) => webFileToOpenAIFile(f.file, `fabric_${i}.png`))
  );
  const garmentOAIFile = await webFileToOpenAIFile(garmentFile, "garment.png");

  const panelLines = fabrics
    .map((f, i) => `- Image ${i + 1} is the fabric for the ${f.panel}`)
    .join("\n");

  const prompt =
    `The following images are fabric swatches assigned to specific panels of the garment shown in the last image:\n` +
    `${panelLines}\n` +
    `Apply each fabric only to its assigned panel. Preserve the exact garment silhouette, cut, drape, and shape. ` +
    `The lighting and shadows should reflect how each fabric would realistically drape on its panel. ` +
    `Photorealistic quality. White or neutral background.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (openai.images.edit as any)({
    model: "gpt-image-1",
    image: [...fabricOAIFiles, garmentOAIFile],
    prompt,
    n: 1,
    size: "1024x1024",
  });

  const b64 = response.data[0].b64_json;
  if (!b64) throw new Error("No image data returned from gpt-image-1");
  return `data:image/png;base64,${b64}`;
}
