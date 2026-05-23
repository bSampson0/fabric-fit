"use client";

import { useCallback, useState } from "react";

interface Props {
  label: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function ImageUploadZone({
  label,
  description,
  file,
  onChange,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const previewUrl = file ? URL.createObjectURL(file) : null;
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const handleFile = useCallback(
    (incoming: File | null) => {
      if (!incoming) return;
      const allowed = ["image/png", "image/jpeg", "image/webp"];
      if (!allowed.includes(incoming.type)) {
        alert("Please upload a PNG, JPEG, or WebP image.");
        return;
      }
      if (incoming.size > 10 * 1024 * 1024) {
        alert("File must be under 10MB.");
        return;
      }
      onChange(incoming);
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <p className="text-xs text-gray-500 -mt-1">{description}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => document.getElementById(inputId)?.click()}
        className={`
          relative flex items-center justify-center w-full h-56 rounded-xl border-2 border-dashed
          cursor-pointer transition-all duration-200
          ${
            dragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40"
          }
        `}
      >
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Preview of ${label}`}
              className="absolute inset-0 w-full h-full object-contain rounded-xl p-1"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center
                         justify-center text-gray-500 hover:text-red-500 shadow text-xs font-bold z-10"
            >
              ×
            </button>
          </>
        ) : (
          <div className="text-center text-gray-400 select-none px-4">
            <div className="text-3xl mb-2">+</div>
            <p className="text-sm">Drag & drop or click to upload</p>
            <p className="text-xs mt-1">PNG, JPEG, WebP — up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
