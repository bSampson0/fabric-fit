import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import type { JobStatus } from "@/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId || !/^[0-9a-f-]{36}$/.test(jobId)) {
    return NextResponse.json({ status: "error", error: "Invalid job ID" }, { status: 400 });
  }

  try {
    const store = getStore("jobs");
    const status = (await store.get(`${jobId}/status`, { type: "json" })) as JobStatus | null;

    if (!status) {
      return NextResponse.json({ status: "error", error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (err: unknown) {
    console.error("[/api/status] Error:", err);
    return NextResponse.json(
      { status: "error", error: "Failed to check status" },
      { status: 500 }
    );
  }
}
