import { NextRequest, NextResponse } from "next/server";
import { runSingleStep } from "@/lib/strategies/singleStep";
import { runPipeline } from "@/lib/strategies/pipeline";
import type { GenerateResponse, GenerateError, Strategy, FabricEntry } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const garmentFile = formData.get("garment") as File | null;
    const strategy = (formData.get("strategy") as Strategy | null) ?? "single";
    const count = parseInt((formData.get("count") as string | null) ?? "0", 10);

    if (!garmentFile || garmentFile.size === 0) {
      return NextResponse.json<GenerateError>(
        { success: false, error: "Garment image is required" },
        { status: 400 }
      );
    }

    if (isNaN(count) || count < 1) {
      return NextResponse.json<GenerateError>(
        { success: false, error: "At least one fabric is required" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 10 * 1024 * 1024;

    if (!allowedTypes.includes(garmentFile.type)) {
      return NextResponse.json<GenerateError>(
        { success: false, error: "Garment image must be JPEG, PNG, or WebP" },
        { status: 400 }
      );
    }
    if (garmentFile.size > MAX_SIZE) {
      return NextResponse.json<GenerateError>(
        { success: false, error: "Garment image must be under 10MB" },
        { status: 400 }
      );
    }

    const fabrics: FabricEntry[] = [];
    for (let i = 0; i < count; i++) {
      const file = formData.get(`fabric_${i}`) as File | null;
      const panel = (formData.get(`panel_${i}`) as string | null)?.trim() ?? "";

      if (!file || file.size === 0) {
        return NextResponse.json<GenerateError>(
          { success: false, error: `Fabric image ${i + 1} is missing` },
          { status: 400 }
        );
      }
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json<GenerateError>(
          { success: false, error: `Fabric image ${i + 1} must be JPEG, PNG, or WebP` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json<GenerateError>(
          { success: false, error: `Fabric image ${i + 1} must be under 10MB` },
          { status: 400 }
        );
      }
      if (!panel) {
        return NextResponse.json<GenerateError>(
          { success: false, error: `Panel name for fabric ${i + 1} is required` },
          { status: 400 }
        );
      }

      fabrics.push({ file, panel });
    }

    let result: GenerateResponse;

    if (strategy === "pipeline") {
      const { imageUrl, prompt } = await runPipeline(fabrics, garmentFile);
      result = { success: true, imageUrl, strategy: "pipeline", prompt };
    } else {
      const imageUrl = await runSingleStep(fabrics, garmentFile);
      result = { success: true, imageUrl, strategy: "single" };
    }

    return NextResponse.json<GenerateResponse>(result);
  } catch (err: unknown) {
    console.error("[/api/generate] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<GenerateError>(
      {
        success: false,
        error: "Failed to generate image",
        detail: message,
      },
      { status: 500 }
    );
  }
}
