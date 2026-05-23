import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { fileToBase64 } from "@/lib/imageUtils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const garmentFile = formData.get("garment") as File | null;

    if (!garmentFile || garmentFile.size === 0) {
      return NextResponse.json(
        { success: false, error: "Garment image is required" },
        { status: 400 }
      );
    }

    const base64 = await fileToBase64(garmentFile);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${garmentFile.type};base64,${base64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text:
                "Look at this garment photo and identify the distinct construction panels " +
                "separated by visible seams and stitching. List only panels that are clearly " +
                "identifiable. Return a JSON array of short, lowercase panel names only — " +
                'for example: ["front body", "left sleeve", "right sleeve", "collar"]. ' +
                "No explanation, no markdown, just the raw JSON array.",
            },
          ],
        },
      ],
    });

    const raw = response.choices[0].message.content ?? "[]";
    let panels: string[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      panels = JSON.parse(match ? match[0] : raw);
    } catch {
      panels = [];
    }

    if (!Array.isArray(panels) || panels.length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not detect panels from this image" },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, panels });
  } catch (err: unknown) {
    console.error("[/api/detect-panels] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "Failed to detect panels", detail: message },
      { status: 500 }
    );
  }
}
