"use client";

import { useEffect, useRef, useState } from "react";
import ImageUploadZone from "@/components/ImageUploadZone";
import type { FabricEntry } from "@/types";

interface InternalEntry {
  file: File | null;
  panel: string;
}

interface Props {
  onChange: (entries: FabricEntry[]) => void;
  suggestedPanels?: string[];
}

export default function FabricPanelList({ onChange, suggestedPanels }: Props) {
  const [entries, setEntries] = useState<InternalEntry[]>([
    { file: null, panel: "" },
  ]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const panelDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (suggestedPanels && suggestedPanels.length > 0) {
      setEntries(suggestedPanels.map((panel) => ({ file: null, panel })));
    }
  }, [suggestedPanels]);

  const notifyParent = (next: InternalEntry[]) => {
    const valid = next.filter(
      (e): e is FabricEntry => e.file !== null && e.panel.trim() !== ""
    );
    onChange(valid);
  };

  const update = (next: InternalEntry[]) => {
    setEntries(next);
    notifyParent(next);
  };

  const setFile = (index: number, file: File | null) => {
    const next = entries.map((e, i) => (i === index ? { ...e, file } : e));
    update(next);
  };

  const setPanel = (index: number, panel: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, panel } : e)));
    if (panelDebounceRef.current) clearTimeout(panelDebounceRef.current);
    panelDebounceRef.current = setTimeout(() => {
      const valid = entriesRef.current.filter(
        (e): e is FabricEntry => e.file !== null && e.panel.trim() !== ""
      );
      onChangeRef.current(valid);
    }, 400);
  };

  const addEntry = () => {
    update([...entries, { file: null, panel: "" }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length === 1) return;
    update(entries.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          Fabric Panels
        </span>
        <button
          type="button"
          onClick={addEntry}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          + Add Fabric
        </button>
      </div>

      {entries.map((entry, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={entry.panel}
              onChange={(e) => setPanel(i, e.target.value)}
              placeholder={`Panel name (e.g. sleeves, body, collar)`}
              className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700
                         placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="text-gray-400 hover:text-red-500 text-sm font-bold leading-none"
                aria-label="Remove panel"
              >
                ×
              </button>
            )}
          </div>

          <ImageUploadZone
            label={`Fabric ${i + 1}`}
            description="Upload a fabric swatch for this panel"
            file={entry.file}
            onChange={(f) => setFile(i, f)}
          />
        </div>
      ))}
    </div>
  );
}
