"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChatError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
        <h1 className="text-base font-semibold text-gray-900">
          Chat unavailable
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          The conversation could not be loaded. Try again or return to the chat
          list.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
