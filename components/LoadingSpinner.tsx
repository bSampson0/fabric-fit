export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm">{message ?? "Generating…"}</p>
    </div>
  );
}
