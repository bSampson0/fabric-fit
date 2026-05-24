"use client";

import { useEffect, useState } from "react";
import FabricPanelList from "@/components/FabricPanelList";
import ImageUploadZone from "@/components/ImageUploadZone";
import ResultDisplay from "@/components/ResultDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { GenerateResponse, GenerateError, JobStarted, JobStatus, Strategy, FabricEntry } from "@/types";

type State =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "polling"; jobId: string }
  | { status: "success"; data: GenerateResponse }
  | { status: "error"; error: string; detail?: string };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export default function Home() {
  const [fabricEntries, setFabricEntries] = useState<FabricEntry[]>([]);
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("single");
  const [state, setState] = useState<State>({ status: "idle" });
  const [suggestedPanels, setSuggestedPanels] = useState<string[]>([]);
  const [detectingPanels, setDetectingPanels] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  // Polling effect — runs whenever we enter the "polling" state
  useEffect(() => {
    if (state.status !== "polling") return;
    const { jobId } = state;

    let cancelled = false;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let timerId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() > deadline) {
        setState({ status: "error", error: "Generation timed out — please try again." });
        return;
      }

      try {
        const res = await fetch(`/api/status/${jobId}`);
        const json = (await res.json()) as JobStatus;

        if (cancelled) return;

        if (json.status === "done") {
          setState({
            status: "success",
            data: {
              success: true,
              imageUrl: json.imageUrl,
              strategy: json.strategy,
              prompt: json.prompt,
            },
          });
        } else if (json.status === "error") {
          setState({ status: "error", error: json.error, detail: json.detail });
        } else {
          timerId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) timerId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    timerId = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [state]);

  const handleDetectPanels = async () => {
    if (!garmentFile) return;
    setDetectingPanels(true);
    setDetectError(null);

    const form = new FormData();
    form.append("garment", garmentFile);

    try {
      const res = await fetch("/api/detect-panels", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDetectError(json.error ?? "Could not detect panels");
      } else {
        setSuggestedPanels(json.panels);
      }
    } catch {
      setDetectError("Network error — could not detect panels");
    } finally {
      setDetectingPanels(false);
    }
  };

  const handleGenerate = async () => {
    if (fabricEntries.length === 0 || !garmentFile) return;

    setState({ status: "submitting" });

    const form = new FormData();
    form.append("garment", garmentFile);
    form.append("strategy", strategy);
    form.append("count", String(fabricEntries.length));
    fabricEntries.forEach((entry, i) => {
      form.append(`fabric_${i}`, entry.file);
      form.append(`panel_${i}`, entry.panel);
    });

    try {
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const json = (await res.json()) as JobStarted | GenerateError;

      if (!res.ok || !("jobId" in json)) {
        const err = json as GenerateError;
        setState({ status: "error", error: err.error, detail: err.detail });
        return;
      }

      setState({ status: "polling", jobId: json.jobId });
    } catch {
      setState({ status: "error", error: "Network error — please check your connection and try again." });
    }
  };

  const canGenerate =
    fabricEntries.length > 0 &&
    !!garmentFile &&
    state.status !== "submitting" &&
    state.status !== "polling";

  const isWorking = state.status === "submitting" || state.status === "polling";

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">FabricFit</h1>
        <p className="mt-2 text-gray-500 text-sm">
          Upload a garment and assign fabrics to each panel — AI will dress the garment in your fabrics.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <div>
          <ImageUploadZone
            label="Garment / Outfit"
            description="Upload a photo or illustration of the garment"
            file={garmentFile}
            onChange={(f) => {
              setGarmentFile(f);
              if (!f) {
                setSuggestedPanels([]);
                setDetectError(null);
              }
            }}
          />
          {garmentFile && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDetectPanels}
                disabled={detectingPanels}
                className={`
                  text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                  ${
                    detectingPanels
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  }
                `}
              >
                {detectingPanels ? "Detecting panels…" : "Detect Panels"}
              </button>
              {suggestedPanels.length > 0 && (
                <span className="text-xs text-gray-500">Found: {suggestedPanels.join(", ")}</span>
              )}
              {detectError && <span className="text-xs text-red-500">{detectError}</span>}
            </div>
          )}
        </div>

        <FabricPanelList
          onChange={setFabricEntries}
          suggestedPanels={suggestedPanels.length > 0 ? suggestedPanels : undefined}
        />
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <span className="font-medium">AI Strategy:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="strategy"
            value="single"
            checked={strategy === "single"}
            onChange={() => setStrategy("single")}
          />
          gpt-image-1 <span className="text-gray-400">(faster)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="strategy"
            value="pipeline"
            checked={strategy === "pipeline"}
            onChange={() => setStrategy("pipeline")}
          />
          GPT-4o + DALL-E 3 <span className="text-gray-400">(fallback)</span>
        </label>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`
          mt-6 w-full py-3 px-6 rounded-xl font-semibold text-white transition-all
          ${canGenerate ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]" : "bg-gray-300 cursor-not-allowed"}
        `}
      >
        {isWorking ? "Generating…" : "Generate"}
      </button>

      {state.status === "submitting" && <LoadingSpinner message="Uploading images…" />}

      {state.status === "polling" && (
        <LoadingSpinner message="AI is generating your garment — this takes 30–90 seconds…" />
      )}

      {state.status === "error" && (
        <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
          {state.detail && <p className="mt-1 text-xs text-red-500">{state.detail}</p>}
        </div>
      )}

      {state.status === "success" && (
        <ResultDisplay
          imageUrl={state.data.imageUrl}
          strategy={state.data.strategy}
          prompt={state.data.prompt}
        />
      )}
    </main>
  );
}
