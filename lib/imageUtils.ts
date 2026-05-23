import OpenAI from "openai";

export async function webFileToOpenAIFile(file: File, filename: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return OpenAI.toFile(buffer, filename, { type: file.type });
}

export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}
