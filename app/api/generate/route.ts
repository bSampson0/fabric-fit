import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "crypto";
import type { GenerateError, JobStarted, Strategy } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

function badRequest(error: string): NextResponse<GenerateError> {
  return NextResponse.json<GenerateError>({ success: false, error }, { status: 400 });
}

function validateFile(file: File | null, label: string): string | null {
  if (!file || file.size === 0) return `${label} is missing`;
  if (!ALLOWED.includes(file.type)) return `${label} must be JPEG, PNG, or WebP`;
  if (file.size > MAX_SIZE) return `${label} must be under 10MB`;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const garmentFile = formData.get("garment") as File | null;
    const strategy = ((formData.get("strategy") as string | null) ?? "single") as Strategy;
    const count = parseInt((formData.get("count") as string | null) ?? "0", 10);

    const garmentErr = validateFile(garmentFile, "Garment image");
    if (garmentErr) return badRequest(garmentErr);
    if (isNaN(count) || count < 1) return badRequest("At least one fabric is required");

    type FabricRaw = { file: File; panel: string; name: string; type: string };
    const fabrics: FabricRaw[] = [];

    for (let i = 0; i < count; i++) {
      const file = formData.get(`fabric_${i}`) as File | null;
      const panel = ((formData.get(`panel_${i}`) as string | null) ?? "").trim();

      const fileErr = validateFile(file, `Fabric ${i + 1}`);
      if (fileErr) return badRequest(fileErr);
      if (!panel) return badRequest(`Panel name for fabric ${i + 1} is required`);

      fabrics.push({ file: file!, panel, name: file!.name, type: file!.type });
    }

    const jobId = randomUUID();
    const store = getStore("jobs");

    // Store job metadata and binary images in parallel
    await Promise.all([
      store.setJSON(`${jobId}/meta`, {
        strategy,
        garmentType: garmentFile!.type,
        garmentName: garmentFile!.name,
        fabrics: fabrics.map(({ panel, name, type }) => ({ panel, name, type })),
      }),
      store.setJSON(`${jobId}/status`, { status: "processing" }),
      (async () => {
        const buf = await garmentFile!.arrayBuffer();
        await store.set(`${jobId}/garment`, buf);
      })(),
      ...fabrics.map(async ({ file }, i) => {
        const buf = await file.arrayBuffer();
        await store.set(`${jobId}/fabric_${i}`, buf);
      }),
    ]);

    // Trigger background function (returns 202 immediately, runs async)
    const siteUrl = process.env.URL ?? req.nextUrl.origin;
    await fetch(`${siteUrl}/.netlify/functions/generate-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    }).catch(async () => {
      await store
        .setJSON(`${jobId}/status`, { status: "error", error: "Failed to start generation" })
        .catch(() => {});
    });

    return NextResponse.json<JobStarted>({ jobId });
  } catch (err: unknown) {
    console.error("[/api/generate] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<GenerateError>(
      { success: false, error: "Failed to start generation", detail: message },
      { status: 500 }
    );
  }
}
