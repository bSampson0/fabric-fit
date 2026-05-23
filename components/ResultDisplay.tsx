"use client";

interface Props {
  imageUrl: string;
  strategy: string;
  prompt?: string;
}

export default function ResultDisplay({ imageUrl, strategy, prompt }: Props) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `fabricfit-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Result</h2>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
          {strategy === "single" ? "gpt-image-1" : "GPT-4o + DALL-E 3"}
        </span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Generated garment with fabric applied"
        className="w-full max-w-lg mx-auto rounded-2xl shadow-lg"
      />

      {prompt && (
        <details className="text-xs text-gray-400 border border-gray-200 rounded-lg p-3 max-w-lg mx-auto w-full">
          <summary className="cursor-pointer font-medium text-gray-500">
            View generation prompt
          </summary>
          <p className="mt-2 leading-relaxed">{prompt}</p>
        </details>
      )}

      <button
        onClick={handleDownload}
        className="w-full max-w-lg mx-auto bg-indigo-600 hover:bg-indigo-700
                   text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
      >
        Download Image
      </button>
    </div>
  );
}
