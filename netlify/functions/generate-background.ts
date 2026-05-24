import { getStore } from "@netlify/blobs";
import type { Handler } from "@netlify/functions";
import { runSingleStep } from "../../lib/strategies/singleStep";
import { runPipeline } from "../../lib/strategies/pipeline";
import type { FabricEntry } from "../../types/index";

type JobMeta = {
  strategy: "single" | "pipeline";
  garmentType: string;
  garmentName: string;
  fabrics: Array<{ panel: string; type: string; name: string }>;
};

export const handler: Handler = async (event) => {
  const { jobId } = JSON.parse(event.body ?? "{}") as { jobId?: string };
  if (!jobId) return { statusCode: 400 };

  const store = getStore("jobs");

  try {
    const meta = (await store.get(`${jobId}/meta`, { type: "json" })) as JobMeta | null;
    if (!meta) return { statusCode: 404 };

    const garmentBuf = (await store.get(`${jobId}/garment`, { type: "arrayBuffer" })) as ArrayBuffer;
    const garmentFile = new File([garmentBuf], meta.garmentName, { type: meta.garmentType });

    const fabricEntries: FabricEntry[] = await Promise.all(
      meta.fabrics.map(async (f, i) => {
        const buf = (await store.get(`${jobId}/fabric_${i}`, { type: "arrayBuffer" })) as ArrayBuffer;
        return { file: new File([buf], f.name, { type: f.type }), panel: f.panel };
      })
    );

    let imageUrl: string;
    let prompt: string | undefined;

    if (meta.strategy === "pipeline") {
      const result = await runPipeline(fabricEntries, garmentFile);
      imageUrl = result.imageUrl;
      prompt = result.prompt;
    } else {
      imageUrl = await runSingleStep(fabricEntries, garmentFile);
    }

    await store.setJSON(`${jobId}/status`, {
      status: "done",
      imageUrl,
      strategy: meta.strategy,
      ...(prompt ? { prompt } : {}),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    await store
      .setJSON(`${jobId}/status`, { status: "error", error: "Generation failed", detail })
      .catch(() => {});
  }

  return { statusCode: 200 };
};
