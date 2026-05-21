"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentsApi, sourcesApi, type Source } from "@/lib/api-client";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Play,
  Plus,
  Radar,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const AGENT_RELEASE_BASE =
  "https://github.com/Kelps-inc/Kget-Cloud/releases/latest/download";

const AGENT_PLATFORMS = [
  { label: "macOS (Apple Silicon)", file: "kget-agent-macos-arm64" },
  { label: "macOS (Intel)", file: "kget-agent-macos-x64" },
  { label: "Linux x64", file: "kget-agent-linux-x64" },
  { label: "Linux ARM64", file: "kget-agent-linux-arm64" },
  { label: "Windows x64", file: "kget-agent-windows-x64.exe" },
];

const JOB_BADGE: Record<string, string> = {
  queued: "bg-gray-100 text-gray-600",
  running: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
  canceled: "bg-gray-100 text-gray-500",
};

function sourceUrl(source: Source) {
  return source.configJson?.url ?? "";
}

function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function errorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Request failed";
  const data = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" ? message : fallback;
}

function SourceRow({
  source,
  onRun,
  onDelete,
  running,
}: {
  source: Source;
  onRun: () => void;
  onDelete: () => void;
  running: boolean;
}) {
  const latestJob = source.recentJobs?.[0];
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-gray-200 bg-white px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">
            {source.name}
          </p>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {source.type}
          </span>
          {!source.enabled && (
            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              disabled
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-gray-500">
          {sourceUrl(source)}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span>{source._count?.fileAssets ?? 0} evidence files</span>
          <span>{source._count?.downloadJobs ?? 0} jobs</span>
          <span>
            Latest evidence: {dateLabel(source.latestFile?.createdAt)}
          </span>
          {latestJob && (
            <span
              className={`rounded px-2 py-0.5 font-medium ${JOB_BADGE[latestJob.status] ?? JOB_BADGE.queued}`}
            >
              {latestJob.status}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <button
          onClick={onRun}
          disabled={running || !source.enabled}
          title="Run collection"
          className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
        >
          {running ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
        </button>
        <button
          onClick={onDelete}
          title="Disable source"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<"url" | "agent_url">(
    "agent_url",
  );
  const [agentName, setAgentName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [commandCopied, setCommandCopied] = useState(false);
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);

  const { data: sources = [], isLoading: loadingSources } = useQuery({
    queryKey: ["sources"],
    queryFn: sourcesApi.list,
    refetchInterval: (query) =>
      query.state.data?.some((source) =>
        source.recentJobs?.some(
          (job) => job.status === "queued" || job.status === "running",
        ),
      )
        ? 3000
        : false,
  });

  const { data: report } = useQuery({
    queryKey: ["collection-report"],
    queryFn: sourcesApi.report,
    refetchInterval: 5000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
  });

  const createSource = useMutation({
    mutationFn: () => sourcesApi.create({ name, url, type: sourceType }),
    onSuccess: () => {
      setName("");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["collection-report"] });
    },
  });

  const runSource = useMutation({
    mutationFn: sourcesApi.run,
    onMutate: (id) => setRunningSourceId(id),
    onSettled: () => {
      setRunningSourceId(null);
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["collection-report"] });
      qc.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const deleteSource = useMutation({
    mutationFn: sourcesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["collection-report"] });
    },
  });

  const createAgent = useMutation({
    mutationFn: () => agentsApi.create({ name: agentName.trim() }),
    onSuccess: (agent) => {
      setCreatedToken(agent.token);
      setAgentName("");
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const canCreate = useMemo(
    () => name.trim().length > 0 && url.trim().length > 0,
    [name, url],
  );

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Document monitor</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Track recurring sources, detect changes, and preserve evidence for
            AI search.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Radar size={17} className="mb-3 text-blue-600" />
          <p className="text-2xl font-bold text-gray-900">
            {report?.summary.monitoredSources ?? 0}
          </p>
          <p className="text-xs text-gray-500">monitored sources</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <CheckCircle size={17} className="mb-3 text-green-600" />
          <p className="text-2xl font-bold text-gray-900">
            {report?.summary.changesDetected ?? 0}
          </p>
          <p className="text-xs text-gray-500">changes detected</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Clock size={17} className="mb-3 text-yellow-600" />
          <p className="text-2xl font-bold text-gray-900">
            {report?.summary.recentJobs ?? 0}
          </p>
          <p className="text-xs text-gray-500">recent jobs</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <AlertCircle size={17} className="mb-3 text-red-600" />
          <p className="text-2xl font-bold text-gray-900">
            {report?.summary.failedJobs ?? 0}
          </p>
          <p className="text-xs text-gray-500">failed jobs</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Sources</h2>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canCreate) createSource.mutate();
            }}
            className="grid gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:grid-cols-[180px_1fr_150px_auto]"
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Source name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/manual.pdf"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as "url" | "agent_url")
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              title="Collection mode"
            >
              <option value="agent_url">Local agent</option>
              <option value="url">Server</option>
            </select>
            <button
              type="submit"
              disabled={!canCreate || createSource.isPending}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createSource.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Add
            </button>
          </form>
          {loadingSources ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : sources.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No monitored sources yet.
            </div>
          ) : (
            sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                running={runningSourceId === source.id}
                onRun={() => runSource.mutate(source.id)}
                onDelete={() => deleteSource.mutate(source.id)}
              />
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Agents</h2>
            </div>
            <div className="space-y-3 p-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (agentName.trim()) createAgent.mutate();
                }}
                className="flex gap-2"
              >
                <input
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder="Agent name"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={!agentName.trim() || createAgent.isPending}
                  title="Create agent token"
                  className="rounded-lg bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {createAgent.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <KeyRound size={16} />
                  )}
                </button>
              </form>
              {createAgent.isError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage(createAgent.error)}
                </p>
              )}
              {createdToken && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-green-800">
                    <ShieldCheck size={14} /> Token created — run these commands
                  </div>
                  <pre className="overflow-x-auto rounded bg-white/70 p-2 text-xs text-green-900">
                    <span className="block">
                      kget-agent login --token {createdToken}
                    </span>
                    <span className="block">kget-agent start</span>
                  </pre>
                  <button
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(
                          `kget-agent login --token ${createdToken}\nkget-agent start`,
                        )
                        .then(() => {
                          setCommandCopied(true);
                          setTimeout(() => setCommandCopied(false), 2000);
                        });
                    }}
                    className="mt-2 flex items-center gap-1 text-xs text-green-700 hover:text-green-900"
                  >
                    <Copy size={12} />
                    {commandCopied ? "Copied!" : "Copy commands"}
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {agent.name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {agent.status} · {dateLabel(agent.lastSeenAt)}
                      </p>
                    </div>
                    <Server size={15} className="text-gray-400" />
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Download size={12} /> Download agent
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_PLATFORMS.map((platform) => (
                    <a
                      key={platform.file}
                      href={`${AGENT_RELEASE_BASE}/${platform.file}`}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {platform.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Audit report
              </h2>
              <Copy size={15} className="text-gray-400" />
            </div>
            <div className="space-y-3 p-5">
              {report?.findings.length ? (
                report.findings.slice(0, 6).map((finding) => (
                  <div
                    key={finding.jobId}
                    className="rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-semibold text-gray-800">
                        {finding.sourceName}
                      </p>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${JOB_BADGE[finding.status] ?? JOB_BADGE.queued}`}
                      >
                        {finding.changed ? "changed" : finding.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {dateLabel(finding.finishedAt ?? finding.createdAt)}
                    </p>
                    {finding.logs.at(-1) && (
                      <p className="mt-2 text-xs text-gray-600">
                        {finding.logs.at(-1)?.message}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">
                  Run a source to generate audit evidence.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
