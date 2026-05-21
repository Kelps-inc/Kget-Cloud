"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi, type FileAsset } from "@/lib/api-client";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

const STATUS_BADGE: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  stored: {
    label: "Queued",
    className: "bg-gray-100 text-gray-600",
    icon: <Clock size={11} />,
  },
  processing: {
    label: "Processing",
    className: "bg-yellow-100 text-yellow-700",
    icon: <Loader2 size={11} className="animate-spin" />,
  },
  indexed: {
    label: "Indexed",
    className: "bg-green-100 text-green-700",
    icon: <CheckCircle size={11} />,
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-600",
    icon: <AlertCircle size={11} />,
  },
};

function formatBytes(bytes: string) {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function errorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Upload failed";
  const data = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" ? message : fallback;
}

function FileCard({
  file,
  onDelete,
}: {
  file: FileAsset;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[file.status] ?? STATUS_BADGE.stored;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="max-w-xs truncate text-sm font-medium text-gray-800">
              {file.originalName}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {formatBytes(file.sizeBytes)} · {file.chunkCount ?? 0} chunks ·{" "}
              {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.icon} {badge.label}
          </span>
          <button
            onClick={onDelete}
            title="Delete file"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {file.status === "error" && file.processingError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {file.processingError}
        </p>
      )}
    </div>
  );
}

export default function FilesPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: filesApi.list,
    refetchInterval: (query) =>
      query.state.data?.some(
        (f) => f.status === "processing" || f.status === "stored",
      )
        ? 3000
        : false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => filesApi.upload(file, setUploadProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files"] });
      setUploadProgress(null);
    },
    onError: () => setUploadProgress(null),
  });

  const remove = useMutation({
    mutationFn: filesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    upload.mutate(fileList[0]);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Documents</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Upload files to build your knowledge base.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Upload size={16} /> Upload file
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.html,.txt,.csv,.xml"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-300"
        }`}
      >
        {upload.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">
              Uploading… {uploadProgress ?? 0}%
            </p>
          </div>
        ) : (
          <>
            <Upload size={28} className="mb-2 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              Drop file here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF, HTML, TXT, CSV, XML · max 50 MB
            </p>
          </>
        )}
      </div>

      {upload.isError && (
        <p className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(upload.error)}
        </p>
      )}

      {/* File list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : files.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No documents yet. Upload your first file above.
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={() => remove.mutate(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
